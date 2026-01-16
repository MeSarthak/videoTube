import express from "express";
import multer from "multer";
import fs from "fs";
import { generateHLS } from "../utils/hls.js";
import { uploadHLSFolder } from "../utils/upload.js";
import crypto from "crypto";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateThumbnail } from "../utils/thumbnail.js";
import { getVideoDuration } from "../utils/duration.js";
import { generateMasterPlaylist } from "../utils/masterPlaylist.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { uploadHLSVideo } from "../controllers/video.controller.js";

const router = express.Router();

// Yeh RAM based storage use karega (NO disk)
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload-abr", verifyJWT, upload.single("video"), async (req, res, next) => {
  try {
    const videoId = crypto.randomUUID();
    if (!req.file) {
      throw new ApiError(400, "No video file uploaded");
    }
    const buffer = req.file.buffer;

    // STEP 1 → HLS Transcode
    const { baseFolder } = await generateHLS(buffer, videoId);

    // STEP 2 → MASTER PLAYLIST (this answers your question)
    const masterPath = generateMasterPlaylist(videoId, [
      "360p",
      "480p",
      "720p",
      "1080p",
    ]);
    console.log("Master Playlist:", masterPath);

    // STEP 3 → Thumbnail
    const thumbPath = await generateThumbnail(buffer, videoId);
    console.log("Thumbnail:", thumbPath);

    // STEP 4 → Duration
    const duration = await getVideoDuration(buffer);
    console.log("Duration:", duration);

    // STEP 5 → Upload Folder to UploadThing
    const uploadResult = await uploadHLSFolder(baseFolder, videoId);

    // STEP 6 → Cleanup temp
    fs.rmSync(baseFolder, { recursive: true, force: true });

    return res.status(200).json(
      new ApiResponse("Video uploaded successfully", {
        videoId,
        duration,
        uploadResult,
      })
    );
  } catch (err) {
    next(err);
  }
});

export { router as videoRouter };
