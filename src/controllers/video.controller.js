import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { addVideoToQueue } from "../queues/video.queue.js";

const uploadHLSVideo = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Video file is required");

  const owner = req.user._id;
  const { title, description } = req.body;
  console.log("FILE RECEIVED? =>", req.file);

  try {
    // 1. Create initial DB entry with "pending" status
    const video = await Video.create({
      title: title || "Untitled Video",
      description: description || "No description",
      owner,
      status: "pending",
      uploadStatus: "pending",
    });

    // 2. Add job to queue
    await addVideoToQueue({
      videoPath: req.file.path,
      videoId: video._id,
      userId: owner,
      title: title,
      description: description,
    });

    // 3. Return immediate response
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
  } catch (err) {
    console.error(err);
    throw new ApiError(500, err.message || "Upload failed");
  }
});

const getVideoStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId).select(
    "status uploadStatus errorMessage masterPlaylist thumbnail"
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video status fetched successfully"));
});

export { uploadHLSVideo, getVideoStatus };
