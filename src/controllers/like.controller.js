import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { likeService } from "../services/like.service.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const result = await likeService.toggleVideoLike(videoId, req.user?._id);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Video like toggled successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const result = await likeService.toggleCommentLike(commentId, req.user?._id);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Comment like toggled successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const videos = await likeService.getLikedVideos(req.user?._id);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Liked videos fetched successfully"));
});

export { toggleVideoLike, toggleCommentLike, getLikedVideos };
