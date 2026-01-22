import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { addVideoToQueue } from "../queues/video.queue.js";

class VideoService {
  async uploadHLSVideo({ file, title, description, ownerId }) {
    if (!file) throw new ApiError(400, "Video file is required");

    try {
      // 1. Create initial DB entry with "pending" status
      const video = await Video.create({
        title: title,
        description: description || "No description",
        owner: ownerId,
        status: "pending",
        uploadStatus: "pending",
      });

      // 2. Add job to queue
      await addVideoToQueue({
        videoPath: file.path,
        videoId: video._id,
        userId: ownerId,
        title: title,
        description: description,
      });

      return video;
    } catch (err) {
      console.error(err);
      throw new ApiError(500, err.message || "Upload failed");
    }
  }

  async getVideoStatus(videoId) {
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
  }) {
    const pipeline = [];

    // 1. Match: Published videos only (and search query if present)
    const matchStage = {
      isPublished: true,
      status: "published", // Ensure processing is complete
    };

    if (query) {
      matchStage.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ];
    }

    if (userId) {
      matchStage.owner = new mongoose.Types.ObjectId(userId);
    }

    pipeline.push({ $match: matchStage });

    // 2. Sort
    const sortStage = {};
    sortStage[sortBy] = sortType === "desc" ? -1 : 1;
    pipeline.push({ $sort: sortStage });

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
              fullName: 1,
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
   * Get video by ID with owner details and like/sub status
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
                fullName: 1,
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
              if: {
                $in: [
                  new mongoose.Types.ObjectId(currentUserId),
                  "$likes.likedBy",
                ],
              },
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
          let: { ownerId: "$owner._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$channel", "$$ownerId"] },
                    {
                      $eq: [
                        "$subscriber",
                        new mongoose.Types.ObjectId(currentUserId),
                      ],
                    },
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

    // Add to Watch History if user is authenticated
    if (currentUserId) {
      await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { watchHistory: videoId }, // Prevent duplicates with $addToSet
      });
    }

    return videoAggregation[0];
  }

  /**
   * Increment view count
   */
  async incrementViewCount(videoId) {
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
