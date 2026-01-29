import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { videoService } from "../services/video.service.js";

const uploadHLSVideo = asyncHandler(async (req, res) => {
  console.log("Upload request received");
  console.log("req.files:", req.files);
  console.log("req.file:", req.file);
  console.log("req.body:", req.body);

  const ownerId = req.user._id;
  const { title, description } = req.body;

  // Handle both single file (video only) and fields (video + thumbnail) uploads
  const file = req.files?.video ? req.files.video[0] : req.file;
  const thumbnail = req.files?.thumbnail ? req.files.thumbnail[0] : null;

  if (!file) {
    throw new ApiError(400, "Video file is required");
  }

  const video = await videoService.uploadHLSVideo({
    file,
    thumbnail, // Pass thumbnail (can be null)
    title,
    description,
    ownerId,
  });

  return res.status(202).json(
    new ApiResponse(
      202,
      {
        videoId: video._id,
        status: "pending",
        message: "Video queued for processing",
      },
      "Video upload accepted and processing started in background"
    )
  );
});

const getVideoStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await videoService.getVideoStatus(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video status fetched successfully"));
});

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy,
    sortType,
    userId,
    tags,
    uploadDate,
    durationMin,
    durationMax,
  } = req.query;

  const result = await videoService.getAllVideos({
    page,
    limit,
    query,
    sortBy,
    sortType,
    userId,
    tags,
    uploadDate,
    durationMin,
    durationMax,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Videos fetched successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // Use optional chaining for req.user since route might be optionally authenticated,
  // but if we enforce JWT middleware, req.user will be present.
  // We'll treat unauthenticated users as having no ID (null).
  const currentUserId = req.user?._id || null;

  const video = await videoService.getVideoById(videoId, currentUserId);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video details fetched successfully"));
});

const getRelatedVideos = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { limit } = req.query;

  const videos = await videoService.getRelatedVideos(videoId, limit);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Related videos fetched successfully"));
});

const incrementViewCount = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  await videoService.incrementViewCount(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "View count incremented successfully"));
});

export {
  uploadHLSVideo,
  getVideoStatus,
  getAllVideos,
  getVideoById,
  getRelatedVideos,
  incrementViewCount,
};
