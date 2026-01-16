import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { generateHLS } from "../utils/hls.js"
import { generateThumbnail } from "../utils/thumbnail.js"
import { generateMasterPlaylist } from "../utils/masterPlaylist.js"
import { uploadHLSFolder } from "../utils/upload.js"
import { getVideoDuration } from "../utils/duration.js"
import { v4 as uuidv4 } from "uuid"

const processVideo = async (videoBuffer) => {
  try {
    const videoId = uuidv4();
    
    // Step 1: Generate HLS variants
    console.log("Generating HLS variants...");
    const { baseFolder, variants } = await generateHLS(videoBuffer, videoId);

    // Step 2: Generate thumbnail
    console.log("Generating thumbnail...");
    const thumbnailUrl = await generateThumbnail(videoBuffer, videoId);

    // Step 3: Get duration
    console.log("Getting duration...");
    const duration = await getVideoDuration(videoBuffer);

    // Step 4: Generate master playlist
    console.log("Generating master playlist...");
    const masterUrl = await generateMasterPlaylist(videoId, variants);

    // Step 5: Upload to UploadThing
    console.log("Uploading files...");
    const uploadedUrls = await uploadHLSFolder(baseFolder, videoId);

    return {
      masterUrl: uploadedUrls[`${videoId}/master.m3u8`] || masterUrl,
      variants,
      thumbnailUrl: uploadedUrls[`${videoId}/thumb.jpg`] || thumbnailUrl,
      duration,
      basePath: baseFolder
    };
  } catch (error) {
    console.error("Video processing error:", error);
    throw error;
  }
};

const uploadHLSVideo = asyncHandler(async (req, res) => {
  const owner = req.user._id;
  const { title, description } = req.body;

  if (!req.file) {
    throw new ApiError(400, "Video file is required");
  }

  try {
    // 1. Run HLS pipeline
    const { masterUrl, variants, thumbnailUrl, duration, basePath } = await processVideo(req.file.buffer);

    if (!masterUrl || !variants) {
      throw new ApiError(500, "Failed to process video");
    }

    // 2. Save in MongoDB
    const video = await Video.create({
      masterPlaylist: masterUrl,
      variants,
      thumbnail: thumbnailUrl,
      title: title || "Untitled Video",
      description,
      duration,
      segmentsBasePath: basePath,
      owner
    });

    // 3. Populate owner for frontend convenience
    const createdVideo = await video.populate("owner", "username email avatar");

    return res.status(201).json(
      new ApiResponse(201, createdVideo, "Video processed & saved successfully")
    );
  } catch (error) {
    throw new ApiError(500, error.message || "Error processing video");
  }
});

export { uploadHLSVideo, processVideo };