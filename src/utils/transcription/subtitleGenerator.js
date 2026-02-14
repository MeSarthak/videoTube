/**
 * Subtitle Generator Service
 * Generates SRT, VTT, JSON, and TXT subtitle files from transcription segments
 * Supports multiple languages with proper encoding
 */

import fs from "fs";
import path from "path";
import { secondsToSrtTime, secondsToVttTime } from "./formatters.js";

/**
 * Generate SRT subtitle content
 *
 * @param {Array<{start: number, end: number, speech: string}>} segments - Transcription segments
 * @returns {string} SRT formatted content
 */
export function generateSrt(segments) {
  if (!segments || segments.length === 0) {
    return "";
  }

  return segments
    .map((segment, index) => {
      const sequenceNumber = index + 1;
      const startTime = secondsToSrtTime(segment.start);
      const endTime = secondsToSrtTime(segment.end);
      const text = segment.speech.trim();

      return `${sequenceNumber}\n${startTime} --> ${endTime}\n${text}\n`;
    })
    .join("\n");
}

/**
 * Generate VTT subtitle content
 *
 * @param {Array<{start: number, end: number, speech: string}>} segments - Transcription segments
 * @param {string} language - Language code for the subtitles (default: 'en')
 * @returns {string} VTT formatted content
 */
export function generateVtt(segments, language = "en") {
  // Use detected language or fallback to 'en'
  const langCode = language && language !== "auto" ? language : "en";

  if (!segments || segments.length === 0) {
    return `WEBVTT\nKind: captions\nLanguage: ${langCode}\n\n`;
  }

  const header = `WEBVTT\nKind: captions\nLanguage: ${langCode}\n\n`;

  const cues = segments
    .map((segment, index) => {
      const startTime = secondsToVttTime(segment.start);
      const endTime = secondsToVttTime(segment.end);
      const text = segment.speech.trim();

      return `${index + 1}\n${startTime} --> ${endTime}\n${text}\n`;
    })
    .join("\n");

  return header + cues;
}

/**
 * Generate JSON output with all transcription data
 *
 * @param {Array} segments - Transcription segments
 * @param {object} metadata - Additional metadata
 * @returns {object} JSON formatted transcription
 */
export function generateJson(segments, metadata = {}) {
  const fullText = segments
    .map((s) => s.speech)
    .join(" ")
    .trim();

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      segmentCount: segments.length,
      language: metadata.language || "auto",
      detectedLanguage: metadata.detectedLanguage || null,
      task: metadata.task || "transcribe",
      originalFile: metadata.originalFile || null,
      duration: metadata.duration || null,
      videoId: metadata.videoId || null,
    },
    fullText,
    segments: segments.map((segment, index) => ({
      index: index + 1,
      start: segment.start,
      end: segment.end,
      duration: segment.end - segment.start,
      text: segment.speech.trim(),
    })),
  };
}

/**
 * Generate plain text transcript
 *
 * @param {Array} segments - Transcription segments
 * @returns {string} Plain text transcript
 */
export function generateTxt(segments) {
  if (!segments || segments.length === 0) {
    return "";
  }
  return segments
    .map((s) => s.speech)
    .join(" ")
    .trim();
}

/**
 * Save subtitle file to disk
 *
 * @param {string} content - Subtitle content
 * @param {string} outputPath - Output file path
 * @returns {Promise<void>}
 */
export async function saveSubtitleFile(content, outputPath) {
  const dir = path.dirname(outputPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return fs.promises.writeFile(outputPath, content, "utf-8");
}

/**
 * Generate all subtitle formats and save to disk
 *
 * @param {Array} segments - Transcription segments
 * @param {string} outputDir - Output directory
 * @param {string} baseName - Base filename (without extension)
 * @param {object} metadata - Additional metadata for JSON output
 * @returns {Promise<{srt: string, vtt: string, json: string, txt: string}>} Paths to generated files
 */
export async function generateAllFormats(
  segments,
  outputDir,
  baseName,
  metadata = {}
) {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get language for VTT header (prefer detected language)
  const language = metadata.detectedLanguage || metadata.language || "en";

  const srtPath = path.join(outputDir, `${baseName}.srt`);
  const vttPath = path.join(outputDir, `${baseName}.vtt`);
  const jsonPath = path.join(outputDir, `${baseName}.json`);
  const txtPath = path.join(outputDir, `${baseName}.txt`);

  // Generate content
  const srtContent = generateSrt(segments);
  const vttContent = generateVtt(segments, language);
  const jsonContent = JSON.stringify(generateJson(segments, metadata), null, 2);
  const txtContent = generateTxt(segments);

  // Save all files in parallel
  await Promise.all([
    saveSubtitleFile(srtContent, srtPath),
    saveSubtitleFile(vttContent, vttPath),
    saveSubtitleFile(jsonContent, jsonPath),
    saveSubtitleFile(txtContent, txtPath),
  ]);

  console.log(`[SubtitleGenerator] Generated subtitle files in ${outputDir}`);
  console.log(
    `[SubtitleGenerator] Files: ${baseName}.srt, ${baseName}.vtt, ${baseName}.json, ${baseName}.txt`
  );

  return {
    srt: srtPath,
    vtt: vttPath,
    json: jsonPath,
    txt: txtPath,
  };
}
