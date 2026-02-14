import express from "express";
import {
  verifyJWT,
  optionalVerifyJWT,
} from "../middlewares/auth.middleware.js";
import {
  uploadHLSVideo,
  getVideoStatus,
  getAllVideos,
  getVideoById,
  incrementViewCount,
  getRelatedVideos,
} from "../controllers/video.controller.js";
import {
  upload,
  validateFileSignature,
} from "../middlewares/diskStorageMulter.middleware.js";
import {
  uploadLimiter,
  viewsLimiter,
} from "../middlewares/rateLimiter.middleware.js";
import { videoSubtitleRouter } from "./subtitle.routes.js";

const router = express.Router();

// Video upload with subtitle options
// Body params: title, description, subtitleLanguage (optional), subtitleTask (optional)
router.post(
  "/upload-abr",
  verifyJWT,
  uploadLimiter,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  validateFileSignature, // Validate actual file signatures after upload
  uploadHLSVideo
);
router.get("/status/:videoId", verifyJWT, getVideoStatus);

// Public Routes (Optional Auth for some)
router.get("/", getAllVideos);
router.get("/:videoId", optionalVerifyJWT, getVideoById);
router.get("/:videoId/related", getRelatedVideos);
router.patch("/:videoId/views", viewsLimiter, incrementViewCount);

// Subtitle routes (nested under video)
// GET /api/v1/videos/:videoId/subtitles - Get subtitle info
// GET /api/v1/videos/:videoId/subtitles/:format - Get subtitle file URL
// POST /api/v1/videos/:videoId/subtitles/regenerate - Regenerate subtitles
router.use("/:videoId/subtitles", videoSubtitleRouter);

export { router as videoRouter };
