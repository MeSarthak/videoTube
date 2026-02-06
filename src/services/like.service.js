import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { notificationService } from "./notification.service.js";
import mongoose from "mongoose";

class LikeService {
  async toggleVideoLike(videoId, userId) {
    if (!videoId || !userId) throw new ApiError(400, "Invalid IDs");

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid video ID format");
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user ID format");
    }

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    // Use atomic operation instead of read-then-write
    const deletedLike = await Like.findOneAndDelete({
      video: videoId,
      likedBy: userId,
    });

    if (deletedLike) {
      return { liked: false };
    }

    // Create new like
    // Handle duplicate key error (E11000) which occurs if concurrent requests
    // try to like the same video - treat as successful since like already exists
    try {
      await Like.create({
        video: videoId,
        likedBy: userId,
      });
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key error - like already exists, treat as successful
        return { liked: true };
      }
      throw err;
    }

    // Notify Video Owner (skip if user likes their own video)
    if (!video.owner.equals(userId)) {
      try {
        await notificationService.createNotification({
          recipient: video.owner,
          sender: userId,
          type: "VIDEO_LIKE",
          referenceId: videoId,
        });
      } catch (notifErr) {
        console.error(`Failed to create like notification:`, notifErr.message);
      }
    }

    return { liked: true };
  }

  async toggleCommentLike(commentId, userId) {
    if (!commentId || !userId) throw new ApiError(400, "Invalid IDs");

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new ApiError(400, "Invalid comment ID format");
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user ID format");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");

    // Use atomic operation instead of read-then-write
    const deletedLike = await Like.findOneAndDelete({
      comment: commentId,
      likedBy: userId,
    });

    if (deletedLike) {
      return { liked: false };
    }

    // Create new like
    // Handle duplicate key error (E11000) which occurs if concurrent requests
    // try to like the same comment - treat as successful since like already exists
    try {
      await Like.create({
        comment: commentId,
        likedBy: userId,
      });
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key error - like already exists, treat as successful
        return { liked: true };
      }
      throw err;
    }

    // Notify Comment Owner (skip if user likes their own comment)
    if (!comment.owner.equals(userId)) {
      try {
        await notificationService.createNotification({
          recipient: comment.owner,
          sender: userId,
          type: "COMMENT_LIKE",
          referenceId: commentId,
        });
      } catch (notifErr) {
        console.error(`Failed to create comment like notification:`, notifErr.message);
      }
    }

    return { liked: true };
  }

  async getLikedVideos(userId) {
    // Validate userId before ObjectId conversion
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user ID format");
    }

    return await Like.aggregate([
      {
        $match: {
          likedBy: new mongoose.Types.ObjectId(userId),
          video: { $exists: true },
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "video",
          foreignField: "_id",
          as: "video",
          pipeline: [
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
          ],
        },
      },
      {
        $unwind: "$video",
      },
      {
        $project: {
          video: 1,
        },
      },
    ]);
  }
}

export const likeService = new LikeService();
