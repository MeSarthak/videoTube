import { generateHLS } from "../utils/hls.js";
import { generateThumbnail } from "../utils/thumbnail.js";
import { generateMasterPlaylist } from "../utils/masterPlaylist.js";
import { uploadHLSFolder } from "../utils/upload.js";
import { getVideoDuration } from "../utils/duration.js";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

const processVideo = async (videoBuffer) => {
  const videoId = uuidv4();
  let baseFolder;

  try {
    // Step 1: HLS variants
    const result = await generateHLS(videoBuffer, videoId);
    baseFolder = result.baseFolder;
    const variants = result.variants;

    // Step 2: Thumbnail
    const thumbnailLocal = await generateThumbnail(videoBuffer, videoId);

    // Step 3: Duration
    const duration = await getVideoDuration(videoBuffer);

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
      uploadedFiles: uploadedMap, // optional debugging / UI usage
    };

  } catch (err) {
    console.error("Video Processing Failed:", err);
    throw err;
  } finally {
    // Cleanup local temp folder (always runs, even on error)
    if (baseFolder && fs.existsSync(baseFolder)) {
      fs.rmSync(baseFolder, { recursive: true, force: true });
    }
  }
};

export { processVideo };