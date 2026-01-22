import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

class CommentService {
  async getVideoComments(videoId, page = 1, limit = 10) {
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

    const comment = await Comment.create({
      content,
      video: videoId,
      owner: userId,
    });

    return comment;
  }

  async updateComment(commentId, userId, content) {
    if (!content) throw new ApiError(400, "Content is required");

    const comment = await Comment.findById(commentId);

    if (!comment) throw new ApiError(404, "Comment not found");
    if (comment.owner.toString() !== userId.toString()) {
      throw new ApiError(403, "Unauthorized to update this comment");
    }

    comment.content = content;
    await comment.save();

    return comment;
  }

  async deleteComment(commentId, userId) {
    const comment = await Comment.findById(commentId);

    if (!comment) throw new ApiError(404, "Comment not found");
    if (comment.owner.toString() !== userId.toString()) {
      throw new ApiError(403, "Unauthorized to delete this comment");
    }

    await Comment.findByIdAndDelete(commentId);
    return { deleted: true };
  }
}

export const commentService = new CommentService();
