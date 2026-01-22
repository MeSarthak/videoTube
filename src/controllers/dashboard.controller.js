import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { dashboardService } from "../services/dashboard.service.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const stats = await dashboardService.getChannelStats(userId);

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Channel stats fetched successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const videos = await dashboardService.getChannelVideos(userId);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
