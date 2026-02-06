import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { notificationService } from "./notification.service.js";
import mongoose from "mongoose";

class CommentService {
  async getVideoComments(videoId, page = 1, limit = 10) {
    // Validate videoId format
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid video ID format");
    }

    const aggregateQuery = Comment.aggregate([
      {
        $match: {
          video: new mongoose.Types.ObjectId(videoId),
        },
      },
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
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return await Comment.aggregatePaginate(aggregateQuery, {
      page,
      limit,
    });
  }

  async addComment(videoId, userId, content) {
    if (!content) throw new ApiError(400, "Content is required");

    // Validate videoId format
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid video ID format");
    }

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    const comment = await Comment.create({
      content,
      video: videoId,
      owner: userId,
    });

    // Notify Video Owner
    // Re-fetching video is not needed since we fetched it above for validation
    // Notify Video Owner (skip if commenter is the video owner)
    if (!video.owner.equals(userId)) {
      try {
        await notificationService.createNotification({
          recipient: video.owner,
          sender: userId,
          type: "COMMENT",
          referenceId: videoId,
        });
      } catch (notifErr) {
        // Log but don't fail the comment creation
        console.error(`Failed to create notification for comment on video ${videoId}:`, notifErr.message);
      }
    }

    return comment;
  }

  async updateComment(commentId, userId, content) {
    if (!content) throw new ApiError(400, "Content is required");

    // Validate commentId format
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new ApiError(400, "Invalid comment ID format");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) throw new ApiError(404, "Comment not found");
    if (!comment.owner.equals(userId)) {
      throw new ApiError(403, "Unauthorized to update this comment");
    }

    comment.content = content;
    await comment.save();

    return comment;
  }

  async deleteComment(commentId, userId) {
    // Validate commentId format
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new ApiError(400, "Invalid comment ID format");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) throw new ApiError(404, "Comment not found");
    if (!comment.owner.equals(userId)) {
      throw new ApiError(403, "Unauthorized to delete this comment");
    }

    const result = await Comment.findByIdAndDelete(commentId);

    if (!result) {
      throw new ApiError(500, "Failed to delete comment");
    }

    return { deleted: true };
  }
}

export const commentService = new CommentService();
