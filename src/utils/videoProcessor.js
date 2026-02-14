import { generateHLS } from "../utils/hls.js";
import { generateThumbnail } from "../utils/thumbnail.js";
import { generateMasterPlaylist } from "../utils/masterPlaylist.js";
import { uploadHLSFolder, uploadSubtitleFiles } from "../utils/upload.js";
import { getVideoDuration } from "../utils/duration.js";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

// Transcription imports
import {
  extractAudio,
  transcribeWithProgress,
  generateAllFormats,
  checkWhisperCli,
  getMediaInfo,
} from "../utils/transcription/index.js";

/**
 * Generate transcription and subtitles for a video
 *
 * @param {string} videoPath - Path to the video file
 * @param {string} videoId - Video ID for output organization
 * @param {object} options - Transcription options
 * @param {string} options.language - Language code or 'auto' (default: 'auto')
 * @param {string} options.task - 'transcribe' or 'translate' (default: 'transcribe')
 * @returns {Promise<{files: object, detectedLanguage: string, segmentCount: number}>}
 */
const generateTranscription = async (videoPath, videoId, options = {}) => {
  const { language = "auto", task = "transcribe" } = options;

  // Check if Whisper is available
  const whisperAvailable = await checkWhisperCli();
  if (!whisperAvailable) {
    throw new Error(
      "Whisper CLI is not installed. Run: pip install openai-whisper"
    );
  }

  // Create output directory for transcription
  const transcriptionDir = path.join("./public/temp", videoId, "transcription");
  if (!fs.existsSync(transcriptionDir)) {
    fs.mkdirSync(transcriptionDir, { recursive: true });
  }

  console.log(`[Transcription] Starting transcription for video ${videoId}`);
  console.log(`[Transcription] Language: ${language}, Task: ${task}`);

  // Step 1: Extract audio from video
  console.log(`[Transcription] Step 1: Extracting audio...`);
  const { audioPath, duration } = await extractAudio(
    videoPath,
    transcriptionDir
  );
  console.log(`[Transcription] Audio extracted: ${audioPath} (${duration}s)`);

  // Step 2: Transcribe audio using Whisper
  console.log(`[Transcription] Step 2: Transcribing with Whisper...`);
  const { segments, detectedLanguage } = await transcribeWithProgress(
    audioPath,
    duration,
    (progress) => {
      console.log(`[Transcription] Progress: ${progress}%`);
    },
    { language, task, outputDir: transcriptionDir }
  );
  console.log(
    `[Transcription] Transcription complete. Detected language: ${detectedLanguage}`
  );
  console.log(`[Transcription] Generated ${segments.length} segments`);

  // Step 3: Generate subtitle files (SRT, VTT, JSON, TXT)
  console.log(`[Transcription] Step 3: Generating subtitle files...`);
  const subtitleFiles = await generateAllFormats(
    segments,
    transcriptionDir,
    "subtitle",
    {
      language,
      detectedLanguage,
      task,
      videoId,
      duration,
    }
  );
  console.log(`[Transcription] Subtitle files generated`);

  // Step 4: Upload subtitle files to Azure
  console.log(
    `[Transcription] Step 4: Uploading subtitle files to cloud storage...`
  );
  const uploadedSubtitles = await uploadSubtitleFiles(subtitleFiles, videoId);
  console.log(`[Transcription] Subtitle files uploaded`);

  // Cleanup: Remove local transcription files
  try {
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
    // Clean up subtitle files after upload
    Object.values(subtitleFiles).forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    // Remove transcription directory if empty
    if (fs.existsSync(transcriptionDir)) {
      fs.rmdirSync(transcriptionDir, { recursive: true });
    }
  } catch (cleanupErr) {
    console.warn(`[Transcription] Cleanup warning: ${cleanupErr.message}`);
  }

  return {
    files: uploadedSubtitles,
    detectedLanguage,
    segmentCount: segments.length,
  };
};

const processVideo = async (
  videoPath,
  existingVideoId,
  subtitleOptions = {}
) => {
  // Use existing ID if provided, otherwise generate new (fallback)
  const videoId = existingVideoId || uuidv4();
  let baseFolder;

  try {
    console.log(
      `[VideoProcessor] Starting processVideo for videoId: ${videoId}`
    );
    console.log(`[VideoProcessor] Local video path: ${videoPath}`);

    // First await generateHLS to capture baseFolder
    console.log(`[VideoProcessor] Step 1: Generating HLS segments...`);
    const hlsResult = await generateHLS(videoPath, videoId);
    baseFolder = hlsResult.baseFolder;
    const variants = hlsResult.variants;
    console.log(
      `[VideoProcessor] HLS generation complete. Base folder: ${baseFolder}`
    );

    // Then run thumbnail and duration in parallel
    console.log(
      `[VideoProcessor] Step 2: Generating Thumbnail and calculating Duration...`
    );
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
    console.log(
      `[VideoProcessor] Step 4: Uploading HLS folder to Cloud Storage...`
    );
    const uploadedMap = await uploadHLSFolder(baseFolder, videoId);
    console.log(
      `[VideoProcessor] Upload complete. ${Object.keys(uploadedMap).length} files uploaded.`
    );

    const masterBlob = `${videoId}/master.m3u8`;
    const thumbnailBlob = `${videoId}/thumb.jpg`;

    // Step 6: Generate transcription and subtitles (non-blocking for video processing)
    let transcriptionResult = null;
    const { language = "auto", task = "transcribe" } = subtitleOptions;

    try {
      console.log(
        `[VideoProcessor] Step 5: Generating transcription and subtitles...`
      );
      transcriptionResult = await generateTranscription(videoPath, videoId, {
        language,
        task,
      });
      console.log(
        `[VideoProcessor] Transcription complete. Detected: ${transcriptionResult.detectedLanguage}`
      );
    } catch (transcriptionError) {
      // Log error but don't fail the entire video processing
      console.error(
        `[VideoProcessor] Transcription failed (non-fatal): ${transcriptionError.message}`
      );
      transcriptionResult = {
        error: transcriptionError.message,
        files: null,
        detectedLanguage: null,
        segmentCount: 0,
      };
    }

    console.log(
      `[VideoProcessor] Video processing finished successfully for ${videoId}`
    );

    return {
      videoId,
      duration,
      variants,
      masterUrl: uploadedMap[masterBlob] || masterBlob,
      thumbnailUrl: uploadedMap[thumbnailBlob] || thumbnailBlob,
      uploadedFiles: uploadedMap,
      // Transcription results
      transcription: transcriptionResult,
    };
  } catch (err) {
    console.error(
      `[VideoProcessor] Video Processing Failed for ${videoId}:`,
      err
    );
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

export { processVideo, generateTranscription };
