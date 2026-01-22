import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

class LikeService {
  async toggleVideoLike(videoId, userId) {
    if (!videoId || !userId) throw new ApiError(400, "Invalid IDs");

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

    return { liked: true };
  }

  async toggleCommentLike(commentId, userId) {
    if (!commentId || !userId) throw new ApiError(400, "Invalid IDs");

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
