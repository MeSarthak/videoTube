import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { addVideoToQueue } from "../queues/video.queue.js";
import {
  SUPPORTED_LANGUAGES,
  validateLanguage,
  getLanguageName,
  getLanguageCount,
} from "../utils/transcription/languages.js";

class SubtitleService {
  /**
   * Get all supported languages for transcription
   * @returns {Object} Languages object with code -> name mapping
   */
  getSupportedLanguages() {
    return {
      languages: SUPPORTED_LANGUAGES,
      count: getLanguageCount(),
      tasks: {
        transcribe: "Transcribe audio in original language",
        translate: "Transcribe and translate to English",
      },
    };
  }

  /**
   * Get subtitle info for a video
   * @param {string} videoId - Video ID
   * @returns {Object} Subtitle status and files
   */
  async getSubtitleInfo(videoId) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid Video ID");
    }

    const video = await Video.findById(videoId).select("subtitles title owner");

    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    return {
      videoId: video._id,
      title: video.title,
      subtitles: video.subtitles,
    };
  }

  /**
   * Get subtitle file URL by format
   * @param {string} videoId - Video ID
   * @param {string} format - Format (srt, vtt, json, txt)
   * @returns {Object} Subtitle file URL
   */
  async getSubtitleFile(videoId, format) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid Video ID");
    }

    const validFormats = ["srt", "vtt", "json", "txt"];
    if (!validFormats.includes(format)) {
      throw new ApiError(
        400,
        `Invalid format. Supported formats: ${validFormats.join(", ")}`
      );
    }

    const video = await Video.findById(videoId).select("subtitles title");

    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    if (video.subtitles.status !== "completed") {
      throw new ApiError(
        400,
        `Subtitles not available. Status: ${video.subtitles.status}`
      );
    }

    const fileUrl = video.subtitles.files?.[format];

    if (!fileUrl) {
      throw new ApiError(404, `Subtitle file in ${format} format not found`);
    }

    return {
      videoId: video._id,
      title: video.title,
      format,
      url: fileUrl,
      language: video.subtitles.detectedLanguage,
    };
  }

  /**
   * Regenerate subtitles for a video
   * @param {string} videoId - Video ID
   * @param {string} userId - User ID (must be owner)
   * @param {Object} options - Regeneration options
   * @param {string} options.language - Language code
   * @param {string} options.task - Task (transcribe/translate)
   * @returns {Object} Updated video info
   */
  async regenerateSubtitles(videoId, userId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid Video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    // Check ownership
    if (video.owner.toString() !== userId.toString()) {
      throw new ApiError(403, "You are not authorized to modify this video");
    }

    // Check if video is in a valid state for regeneration
    if (video.status !== "published") {
      throw new ApiError(
        400,
        `Cannot regenerate subtitles. Video status: ${video.status}`
      );
    }

    // Validate language if provided
    const language = options.language || "auto";
    if (!validateLanguage(language)) {
      throw new ApiError(400, `Unsupported language: ${language}`);
    }

    // Validate task
    const task = options.task || "transcribe";
    if (!["transcribe", "translate"].includes(task)) {
      throw new ApiError(400, 'Invalid task. Use "transcribe" or "translate"');
    }

    // Check if regeneration is already in progress
    if (video.subtitles.status === "processing") {
      throw new ApiError(400, "Subtitle regeneration already in progress");
    }

    // Update subtitle status to pending
    await Video.findByIdAndUpdate(videoId, {
      "subtitles.status": "pending",
      "subtitles.language": language,
      "subtitles.task": task,
      "subtitles.errorMessage": null,
    });

    // Add to queue for regeneration
    // Note: We need the original video file path, but it's cleaned up after processing
    // For now, we'll need to download from Azure or store the original path
    // This is a limitation that needs architectural discussion

    // For MVP, we'll throw an error indicating this feature requires the original file
    throw new ApiError(
      501,
      "Subtitle regeneration requires access to the original video file. " +
        "This feature is planned for a future release where we'll store a reference " +
        "to the source video or allow re-upload for regeneration."
    );

    // Future implementation would look like:
    // await addVideoToQueue({
    //   videoPath: originalVideoPath,
    //   videoId: video._id,
    //   userId: userId,
    //   title: video.title,
    //   description: video.description,
    //   subtitleLanguage: language,
    //   subtitleTask: task,
    //   regenerateSubtitlesOnly: true, // New flag to skip video processing
    // });

    // return {
    //   videoId: video._id,
    //   status: "pending",
    //   message: "Subtitle regeneration queued",
    //   language: getLanguageName(language),
    //   task,
    // };
  }
}

export const subtitleService = new SubtitleService();
