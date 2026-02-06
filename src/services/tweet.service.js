import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";

class TweetService {
  async createTweet({ content, ownerId }) {
    // Validate content - reject whitespace-only strings
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new ApiError(400, "Content is required");
    }

    // Validate ownerId format
    if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
      throw new ApiError(400, "Invalid owner ID format");
    }

    const tweet = await Tweet.create({
      content,
      owner: ownerId,
    });

    return tweet;
  }

  async getUserTweets(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid User ID");
    }

    const tweets = await Tweet.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      },
      // Lookup Likes Count
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "tweet",
          as: "likes",
        },
      },
      {
        $addFields: {
          likesCount: { $size: "$likes" },
        },
      },
      {
        $project: {
          likes: 0,
        },
      },
    ]);

    return tweets;
  }

  async updateTweet(tweetId, content, userId) {
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
      throw new ApiError(400, "Invalid Tweet ID");
    }

    // Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid User ID");
    }

    // Validate content
    if (!content || (typeof content === "string" && content.trim().length === 0)) {
      throw new ApiError(400, "Content is required and cannot be empty");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new ApiError(404, "Tweet not found");

    if (tweet.owner.toString() !== userId.toString()) {
      throw new ApiError(
        403,
        "You do not have permission to update this tweet"
      );
    }

    tweet.content = content;
    await tweet.save();

    return tweet;
  }

  async deleteTweet(tweetId, userId) {
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
      throw new ApiError(400, "Invalid Tweet ID");
    }

    // Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid User ID");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new ApiError(404, "Tweet not found");

    if (tweet.owner.toString() !== userId.toString()) {
      throw new ApiError(
        403,
        "You do not have permission to delete this tweet"
      );
    }

    await Tweet.findByIdAndDelete(tweetId);

    // Cascade delete associated likes
    await Like.deleteMany({ tweet: tweetId });

    return { message: "Tweet deleted successfully" };
  }
}

export const tweetService = new TweetService();
