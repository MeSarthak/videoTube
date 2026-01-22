import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";

class DashboardService {
  async getChannelStats(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid User ID");
    }

    const channelId = new mongoose.Types.ObjectId(userId);

    // 1. Get Total Videos & Total Views
    const videoStats = await Video.aggregate([
      {
        $match: {
          owner: channelId,
        },
      },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: "$views" },
        },
      },
    ]);

    // 2. Get Total Subscribers
    const subscribersStats = await Subscription.aggregate([
      {
        $match: {
          channel: channelId,
        },
      },
      {
        $group: {
          _id: null,
          totalSubscribers: { $sum: 1 },
        },
      },
    ]);

    // 3. Get Total Likes (on all videos)
    const likesStats = await Like.aggregate([
      {
        $lookup: {
          from: "videos",
          localField: "video",
          foreignField: "_id",
          as: "videoDetails",
        },
      },
      {
        $unwind: "$videoDetails",
      },
      {
        $match: {
          "videoDetails.owner": channelId,
        },
      },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: 1 },
        },
      },
    ]);

    return {
      totalVideos: videoStats[0]?.totalVideos || 0,
      totalViews: videoStats[0]?.totalViews || 0,
      totalSubscribers: subscribersStats[0]?.totalSubscribers || 0,
      totalLikes: likesStats[0]?.totalLikes || 0,
    };
  }

  async getChannelVideos(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid User ID");
    }

    const videos = await Video.find({ owner: userId }).sort({ createdAt: -1 });
    return videos;
  }
}

export const dashboardService = new DashboardService();
