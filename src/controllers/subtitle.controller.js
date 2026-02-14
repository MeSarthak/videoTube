import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { subtitleService } from "../services/subtitle.service.js";

/**
 * Get all supported languages for transcription
 * GET /api/v1/subtitles/languages
 */
const getSupportedLanguages = asyncHandler(async (req, res) => {
  const languages = subtitleService.getSupportedLanguages();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        languages,
        "Supported languages fetched successfully"
      )
    );
});

/**
 * Get subtitle info for a video
 * GET /api/v1/videos/:videoId/subtitles
 */
const getSubtitleInfo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const subtitleInfo = await subtitleService.getSubtitleInfo(videoId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, subtitleInfo, "Subtitle info fetched successfully")
    );
});

/**
 * Get subtitle file URL by format
 * GET /api/v1/videos/:videoId/subtitles/:format
 */
const getSubtitleFile = asyncHandler(async (req, res) => {
  const { videoId, format } = req.params;

  const subtitleFile = await subtitleService.getSubtitleFile(videoId, format);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subtitleFile,
        "Subtitle file URL fetched successfully"
      )
    );
});

/**
 * Regenerate subtitles for a video
 * POST /api/v1/videos/:videoId/subtitles/regenerate
 */
const regenerateSubtitles = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;
  const { language, task } = req.body;

  const result = await subtitleService.regenerateSubtitles(videoId, userId, {
    language,
    task,
  });

  return res
    .status(202)
    .json(
      new ApiResponse(202, result, "Subtitle regeneration queued successfully")
    );
});

export {
  getSupportedLanguages,
  getSubtitleInfo,
  getSubtitleFile,
  regenerateSubtitles,
};
