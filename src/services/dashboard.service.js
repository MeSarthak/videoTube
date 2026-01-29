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

    // 1. Get Total Videos & Total Views (Optimized with countDocuments where possible)
    const totalVideos = await Video.countDocuments({ owner: channelId });

    const videoStats = await Video.aggregate([
      { $match: { owner: channelId } },
      { $group: { _id: null, totalViews: { $sum: "$views" } } },
    ]);

    // 2. Get Total Subscribers (Optimized)
    const totalSubscribers = await Subscription.countDocuments({
      channel: channelId,
    });

    // 3. Get Total Likes (Optimized for Scalability)
    // approach: fetch user's video IDs first, then count likes for those videos.
    // This avoids the 16MB BSON limit that occurs with $lookup on videos with many likes.
    const videos = await Video.find({ owner: channelId }, { _id: 1 });
    const videoIds = videos.map((video) => video._id);

    const totalLikes = await Like.countDocuments({
      video: { $in: videoIds },
    });

    return {
      totalVideos: totalVideos || 0,
      totalViews: videoStats[0]?.totalViews || 0,
      totalSubscribers: totalSubscribers || 0,
      totalLikes: totalLikes || 0,
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
