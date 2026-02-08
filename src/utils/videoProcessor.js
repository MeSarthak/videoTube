import { generateHLS } from "../utils/hls.js";
import { generateThumbnail } from "../utils/thumbnail.js";
import { generateMasterPlaylist } from "../utils/masterPlaylist.js";
import { uploadHLSFolder } from "../utils/upload.js";
import { getVideoDuration } from "../utils/duration.js";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

const processVideo = async (videoPath, existingVideoId) => {
  // Use existing ID if provided, otherwise generate new (fallback)
  const videoId = existingVideoId || uuidv4();
  let baseFolder;

  try {
    console.log(`[VideoProcessor] Starting processVideo for videoId: ${videoId}`);
    console.log(`[VideoProcessor] Local video path: ${videoPath}`);

    // First await generateHLS to capture baseFolder
    console.log(`[VideoProcessor] Step 1: Generating HLS segments...`);
    const hlsResult = await generateHLS(videoPath, videoId);
    baseFolder = hlsResult.baseFolder;
    const variants = hlsResult.variants;
    console.log(`[VideoProcessor] HLS generation complete. Base folder: ${baseFolder}`);

    // Then run thumbnail and duration in parallel
    console.log(`[VideoProcessor] Step 2: Generating Thumbnail and calculating Duration...`);
    const [thumbnailLocal, duration] = await Promise.all([
      generateThumbnail(videoPath, videoId),
      getVideoDuration(videoPath),
    ]);
    console.log(`[VideoProcessor] Thumbnail generated: ${thumbnailLocal}`);
    console.log(`[VideoProcessor] Video Duration: ${duration}`);

    // Step 4: Master playlist generate
    console.log(`[VideoProcessor] Step 3: Generating Master Playlist...`);
    await generateMasterPlaylist(videoId, variants);
    console.log(`[VideoProcessor] Master Playlist generated.`);

    // Step 5: Upload folder -> Azure Blob Storage
    console.log(`[VideoProcessor] Step 4: Uploading HLS folder to Cloud Storage...`);
    const uploadedMap = await uploadHLSFolder(baseFolder, videoId);
    console.log(`[VideoProcessor] Upload complete. ${Object.keys(uploadedMap).length} files uploaded.`);

    const masterBlob = `${videoId}/master.m3u8`;
    const thumbnailBlob = `${videoId}/thumb.jpg`;

    console.log(`[VideoProcessor] Video processing finished successfully for ${videoId}`);

    return {
      videoId,
      duration,
      variants,
      masterUrl: uploadedMap[masterBlob] || masterBlob,
      thumbnailUrl: uploadedMap[thumbnailBlob] || thumbnailBlob,
      uploadedFiles: uploadedMap,
    };
  } catch (err) {
    console.error(`[VideoProcessor] Video Processing Failed for ${videoId}:`, err);
    throw err;
  } finally {
    // Wrap cleanup in try-catch to prevent masking original error
    try {
      // Cleanup local temp folder
      if (baseFolder && fs.existsSync(baseFolder)) {
        console.log(`[VideoProcessor] Cleaning up temp folder: ${baseFolder}`);
        fs.rmSync(baseFolder, { recursive: true, force: true });
      }
      // Cleanup the uploaded original video file from disk
      if (videoPath && fs.existsSync(videoPath)) {
        // console.log(`[VideoProcessor] Cleaning up original video file: ${videoPath}`);
        // fs.unlinkSync(videoPath);
      }
    } catch (cleanupErr) {
      // Log cleanup errors but don't throw to preserve original error
      console.error("[VideoProcessor] Cleanup error:", cleanupErr);
    }
  }
};

export { processVideo };
