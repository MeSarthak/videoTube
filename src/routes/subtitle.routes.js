import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getSupportedLanguages,
  getSubtitleInfo,
  getSubtitleFile,
  regenerateSubtitles,
} from "../controllers/subtitle.controller.js";

const router = express.Router();

// Public routes
router.get("/languages", getSupportedLanguages);

// Video-specific subtitle routes (mounted under /api/v1/videos/:videoId/subtitles)
// These are registered separately in video.routes.js or as nested routes

// Standalone subtitle routes
export { router as subtitleRouter };

// Video subtitle sub-router (to be mounted under video routes)
const videoSubtitleRouter = express.Router({ mergeParams: true });

// GET /api/v1/videos/:videoId/subtitles - Get subtitle info
videoSubtitleRouter.get("/", getSubtitleInfo);

// GET /api/v1/videos/:videoId/subtitles/:format - Get subtitle file URL
videoSubtitleRouter.get("/:format", getSubtitleFile);

// POST /api/v1/videos/:videoId/subtitles/regenerate - Regenerate subtitles (auth required)
videoSubtitleRouter.post("/regenerate", verifyJWT, regenerateSubtitles);

export { videoSubtitleRouter };
