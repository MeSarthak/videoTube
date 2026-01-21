import { generateHLS } from "../utils/hls.js";
import { generateThumbnail } from "../utils/thumbnail.js";
import { generateMasterPlaylist } from "../utils/masterPlaylist.js";
import { uploadHLSFolder } from "../utils/upload.js";
import { getVideoDuration } from "../utils/duration.js";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

const processVideo = async (videoPath) => {
  const videoId = uuidv4();
  let baseFolder;

  try {
    // Run generation tasks in parallel
    const [hlsResult, thumbnailLocal, duration] = await Promise.all([
      generateHLS(videoPath, videoId),
      generateThumbnail(videoPath, videoId),
      getVideoDuration(videoPath),
    ]);

    baseFolder = hlsResult.baseFolder;
    const variants = hlsResult.variants;

    // Step 4: Master playlist generate
    const masterLocal = await generateMasterPlaylist(videoId, variants);

    // Step 5: Upload folder -> Azure Blob Storage
    const uploadedMap = await uploadHLSFolder(baseFolder, videoId);

    return {
      videoId,
      duration,
      variants,
      masterUrl: uploadedMap[`${videoId}/master.m3u8`] || masterLocal,
      thumbnailUrl: uploadedMap[`${videoId}/thumb.jpg`] || thumbnailLocal,
      uploadedFiles: uploadedMap,
    };
  } catch (err) {
    console.error("Video Processing Failed:", err);
    throw err;
  } finally {
    // Cleanup local temp folder
    if (baseFolder && fs.existsSync(baseFolder)) {
      fs.rmSync(baseFolder, { recursive: true, force: true });
    }
    // Cleanup the uploaded original video file from disk
    if (videoPath && fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
  }
};

export { processVideo };
