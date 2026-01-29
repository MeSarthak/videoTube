import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { notificationService } from "./notification.service.js";
import mongoose from "mongoose";

class LikeService {
  async toggleVideoLike(videoId, userId) {
    if (!videoId || !userId) throw new ApiError(400, "Invalid IDs");

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    const existingLike = await Like.findOne({
      video: videoId,
      likedBy: userId,
    });

    if (existingLike) {
      await Like.findByIdAndDelete(existingLike._id);
      return { liked: false };
    }

    await Like.create({
      video: videoId,
      likedBy: userId,
    });

    // Notify Video Owner
    // Video is already fetched above for validation
    // Skip notification if user likes their own video
    if (!video.owner.equals(userId)) {
      await notificationService.createNotification({
        recipient: video.owner,
        sender: userId,
        type: "VIDEO_LIKE",
        referenceId: videoId,
      });
    }

    return { liked: true };
  }

  async toggleCommentLike(commentId, userId) {
    if (!commentId || !userId) throw new ApiError(400, "Invalid IDs");

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");

    const existingLike = await Like.findOne({
      comment: commentId,
      likedBy: userId,
    });

    if (existingLike) {
      await Like.findByIdAndDelete(existingLike._id);
      return { liked: false };
    }

    await Like.create({
      comment: commentId,
      likedBy: userId,
    });

    // Notify Comment Owner
    // Comment already fetched above
    // Skip notification if user likes their own comment
    if (!comment.owner.equals(userId)) {
      await notificationService.createNotification({
        recipient: comment.owner,
        sender: userId,
        type: "COMMENT_LIKE",
        referenceId: commentId,
      });
    }

    return { liked: true };
  }

  async getLikedVideos(userId) {
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
