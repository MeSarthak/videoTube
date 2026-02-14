import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { addVideoToQueue } from "../queues/video.queue.js";
import { validateLanguage } from "../utils/transcription/languages.js";

class VideoService {
  async uploadHLSVideo({
    file,
    title,
    description,
    ownerId,
    subtitleLanguage = "auto",
    subtitleTask = "transcribe",
  }) {
    if (!file) throw new ApiError(400, "Video file is required");

    // Validate subtitle options
    if (subtitleLanguage && !validateLanguage(subtitleLanguage)) {
      throw new ApiError(
        400,
        `Unsupported subtitle language: ${subtitleLanguage}`
      );
    }

    if (subtitleTask && !["transcribe", "translate"].includes(subtitleTask)) {
      throw new ApiError(
        400,
        'Invalid subtitle task. Use "transcribe" or "translate"'
      );
    }

    try {
      // 1. Create initial DB entry with "pending" status
      const video = await Video.create({
        title: title,
        description: description || "No description",
        owner: ownerId,
        status: "pending",
        uploadStatus: "pending",
        subtitles: {
          status: "pending",
          language: subtitleLanguage || "auto",
          task: subtitleTask || "transcribe",
        },
      });

      console.log(
        `[Service] Video DB record created: ${video._id}, Status: pending`
      );
      console.log(
        `[Service] Subtitle options: language=${subtitleLanguage}, task=${subtitleTask}`
      );

      try {
        // 2. Add job to queue
        console.log(
          `[Service] Adding video ${video._id} to processing queue...`
        );
        await addVideoToQueue({
          videoPath: file.path,
          videoId: video._id,
          userId: ownerId,
          title: title,
          description: description,
          subtitleLanguage: subtitleLanguage || "auto",
          subtitleTask: subtitleTask || "transcribe",
        });
        console.log(`[Service] Video ${video._id} added to queue successfully`);
      } catch (queueError) {
        console.error(
          `[Service] Failed to add video ${video._id} - queue error:`,
          queueError
        );
        // Clean up uploaded file on queue failure
        if (file && file.path) {
          try {
            await import("fs/promises").then((fs) => fs.unlink(file.path));
            console.log(
              `[Service] Cleaned up file ${file.path} after queue error`
            );
          } catch (unlinkErr) {
            console.error(
              `Failed to cleanup file at ${file.path}:`,
              unlinkErr.message
            );
          }
        }
        // If queue fails, delete the DB entry to avoid zombie records
        await Video.findByIdAndDelete(video._id);
        console.log(
          `[Service] Deleted video record ${video._id} due to queue failure`
        );
        throw new ApiError(500, "Failed to queue video for processing");
      }

      return video;
    } catch (err) {
      // Preserve original ApiError if it exists
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, err.message || "Upload failed");
    }
  }

  async getVideoStatus(videoId) {
    // Validate videoId format
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId).select(
      "status uploadStatus errorMessage masterPlaylist thumbnail"
    );

    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    return video;
  }

  /**
   * Get all videos with search, filter, and pagination
   */
  async getAllVideos({
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
    tags,
    uploadDate,
    durationMin,
    durationMax,
  }) {
    const pipeline = [];

    // 1. Match: Published videos only (and search query if present)
    const matchStage = {
      isPublished: true,
      status: "published", // Ensure processing is complete
    };

    // Text Search (Title/Description)
    if (query) {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      matchStage.$or = [
        { title: { $regex: escapedQuery, $options: "i" } },
        { description: { $regex: escapedQuery, $options: "i" } },
      ];
    }

    // Owner Filter
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid User ID");
      }
      matchStage.owner = new mongoose.Types.ObjectId(userId);
    }

    // Tags Filter
    if (tags) {
      const tagsArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      if (tagsArray.length > 0) {
        matchStage.tags = { $in: tagsArray };
      }
    }

    // Duration Filter (in seconds)
    if (durationMin || durationMax) {
      matchStage.duration = {};
      if (durationMin) matchStage.duration.$gte = parseFloat(durationMin);
      if (durationMax) matchStage.duration.$lte = parseFloat(durationMax);
    }

    // Upload Date Filter
    if (uploadDate) {
      const now = new Date();
      let startDate;

      switch (uploadDate) {
        case "today":
          startDate = new Date(now.getTime());
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate = new Date(now.getTime());
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
          startDate = new Date(now.getTime());
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case "year":
          startDate = new Date(now.getTime());
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          break;
      }

      if (startDate) {
        matchStage.createdAt = { $gte: startDate };
      }
    }

    pipeline.push({ $match: matchStage });

    // 2. Lookup & Sort Strategies
    if (sortBy === "mostLiked") {
      // For "mostLiked", we need to count likes first
      pipeline.push({
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        },
      });
      pipeline.push({
        $addFields: {
          likesCount: { $size: "$likes" },
        },
      });
      pipeline.push({
        $sort: { likesCount: sortType === "asc" ? 1 : -1 },
      });
      // Remove the heavy likes array after sorting to keep payload light
      pipeline.push({
        $project: {
          likes: 0,
        },
      });
    } else {
      // Standard Sort (createdAt, views, duration)
      const sortStage = {};
      // Map 'mostViewed' to 'views' field
      const sortField = sortBy === "mostViewed" ? "views" : sortBy;
      sortStage[sortField] = sortType === "desc" ? -1 : 1;
      pipeline.push({ $sort: sortStage });
    }

    // 3. Lookup Owner Details
    pipeline.push({
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    });

    pipeline.push({
      $unwind: "$ownerDetails",
    });

    // 4. Paginate
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      customLabels: {
        totalDocs: "totalVideos",
        docs: "videos",
      },
    };

    return Video.aggregatePaginate(Video.aggregate(pipeline), options);
  }

  /**
   * Get video by ID with owner details, like/sub status, and SAS URLs
   */
  async getVideoById(videoId, currentUserId) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid Video ID");
    }

    const videoAggregation = await Video.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(videoId),
          isPublished: true, // Only show published videos
        },
      },
      // Lookup Owner
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                username: 1,
                fullname: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          owner: { $first: "$owner" },
        },
      },
      // Lookup Likes (count)
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        },
      },
      {
        $addFields: {
          likesCount: { $size: "$likes" },
          isLiked: {
            $cond: {
              if: currentUserId
                ? {
                    $in: [
                      new mongoose.Types.ObjectId(currentUserId),
                      "$likes.likedBy",
                    ],
                  }
                : false,
              then: true,
              else: false,
            },
          },
        },
      },
      // Lookup Subscriber Status (is current user subscribed to owner?)
      {
        $lookup: {
          from: "subscriptions",
          let: {
            ownerId: "$owner._id",
            currentUserId: currentUserId
              ? new mongoose.Types.ObjectId(currentUserId)
              : null,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$channel", "$$ownerId"] },
                    currentUserId
                      ? { $eq: ["$subscriber", "$$currentUserId"] }
                      : { $eq: [true, false] },
                  ],
                },
              },
            },
          ],
          as: "isSubscribed",
        },
      },
      {
        $addFields: {
          isSubscribed: {
            $cond: {
              if: { $gt: [{ $size: "$isSubscribed" }, 0] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          likes: 0, // Remove raw likes array
        },
      },
    ]);

    if (!videoAggregation?.length) {
      throw new ApiError(404, "Video not found");
    }

    const video = videoAggregation[0];

    // Note: masterPlaylist and thumbnail now contain blob paths only
    // Frontend should request SAS tokens via /api/v1/sas-tokens endpoints

    // Add to Watch History if user is authenticated
    if (currentUserId) {
      // Ensure videoId is stored as ObjectId in watchHistory
      const videoIdObjectId = new mongoose.Types.ObjectId(videoId);
      await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { watchHistory: videoIdObjectId }, // Prevent duplicates with $addToSet
      });
    }

    return video;
  }

  /**
   * Get related videos based on owner and title matching
   */
  async getRelatedVideos(videoId, limit = 10) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid Video ID");
    }

    const currentVideo = await Video.findById(videoId);
    if (!currentVideo) {
      throw new ApiError(404, "Video not found");
    }

    // Helper function to escape regex special characters
    const escapeRegExp = (str) => {
      return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    // Split title into words for basic keyword matching (exclude short words)
    const titleWords = currentVideo.title
      .split(" ")
      .filter((w) => w.length > 3)
      .map((w) => escapeRegExp(w));
    const regexPattern = titleWords.join("|"); // "Learn|Javascript|React" (escaped)

    // Build $or array conditionally
    const orConditions = [{ owner: currentVideo.owner }]; // Same channel
    if (titleWords.length > 0) {
      orConditions.push({ title: { $regex: regexPattern, $options: "i" } }); // Similar title
    }

    const relatedVideos = await Video.aggregate([
      {
        $match: {
          $and: [
            { _id: { $ne: new mongoose.Types.ObjectId(videoId) } }, // Exclude current video
            { isPublished: true },
            { status: "published" },
            {
              $or: orConditions,
            },
          ],
        },
      },
      // Lookup Owner Details
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "ownerDetails",
          pipeline: [
            {
              $project: {
                username: 1,
                fullname: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$ownerDetails" },
      { $limit: parseInt(limit) },
    ]);

    return relatedVideos;
  }

  /**
   * Increment view count
   */
  async incrementViewCount(videoId) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid Video ID");
    }
    const video = await Video.findByIdAndUpdate(
      videoId,
      {
        $inc: { views: 1 },
      },
      { new: true }
    );

    if (!video) {
      throw new ApiError(404, "Video not found");
    }
    return video;
  }
}

export const videoService = new VideoService();
