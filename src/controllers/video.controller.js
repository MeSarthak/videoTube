import { processVideo } from "../utils/videoProcessor.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

const uploadHLSVideo = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Video file is required");

  const owner = req.user._id;
  const { title, description } = req.body;
  console.log("FILE RECEIVED? =>", req.file);
  try {
    // 1. Process Video (universal function)
    const { videoId, masterUrl, variants, thumbnailUrl, duration } =
      await processVideo(req.file.buffer);

    if (!masterUrl || !variants) {
      throw new ApiError(500, "Video processing pipeline failed");
    }

    // 2. Save in MongoDB
    const video = await Video.create({
      masterPlaylist: masterUrl,
      variants,
      thumbnail: thumbnailUrl,
      title: title || "Untitled Video",
      description: description || "No description", 
      duration,
      segmentsBasePath: videoId,
      owner,
    });

    const populated = await video.populate("owner", "username email avatar");

    return res
      .status(201)
      .json(
        new ApiResponse(201, populated, "Video processed & saved successfully")
      );
  } catch (err) {
    console.error(err);
    throw new ApiError(500, err.message || "Upload failed");
  }
});

export { uploadHLSVideo };
