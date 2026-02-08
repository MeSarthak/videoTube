import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { processVideo } from "../utils/videoProcessor.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import fs from "fs";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const isSecure = redisUrl.startsWith("rediss://");

// Build TLS config for secure connections
let tlsConfig;
if (isSecure) {
  tlsConfig = {
    servername: new URL(redisUrl).hostname,
    rejectUnauthorized: process.env.NODE_ENV !== "development" && process.env.REDIS_ALLOW_INVALID_CERTS !== "true", // Configurable
  };
  // Add CA bundle if provided
  if (process.env.REDIS_CA) {
    try {
      tlsConfig.ca = [fs.readFileSync(process.env.REDIS_CA, "utf-8")];
    } catch (err) {
      console.warn(`[Worker] Failed to load REDIS_CA from ${process.env.REDIS_CA}:`, err.message);
    }
  }
}

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  connectTimeout: 20000,
  retryStrategy: function (times) {
    return Math.min(times * 100, 3000); // Increased retry delay slightly
  },
  tls: tlsConfig,
});

connection.on("error", (err) => {
  console.error(`[Worker] Redis connection error: ${err.message}`);
});

const worker = new Worker(
  "video-processing",
  async (job) => {
    const { videoPath, videoId, userId, title, description } = job.data;
    console.log(`[Worker] Start processing job ${job.id} for video ${videoId}`);
    console.log(`[Worker] Video path: ${videoPath}`);

    try {
      // Update status to processing
      await Video.findByIdAndUpdate(videoId, {
        status: "processing",
        uploadStatus: "processing",
      });
      console.log(`[Worker] Updated status to 'processing' for video ${videoId}`);

      // 1. Process Video
      // Pass videoId so the processor uses the same ID as the database record
      const { masterUrl, variants, thumbnailUrl, duration } =
        await processVideo(videoPath, videoId);

      if (!masterUrl || !variants) {
        throw new Error("Video processing pipeline failed: Missing masterUrl or variants");
      }

      console.log(`[Worker] Video processed successfully. Duration: ${duration}`);

      // 2. Update Video in MongoDB
      const video = await Video.findByIdAndUpdate(
        videoId,
        {
          masterPlaylist: masterUrl,
          variants,
          thumbnail: thumbnailUrl,
          duration,
          status: "published",
          uploadStatus: "completed",
        },
        { new: true }
      );

      // Check if video document still exists after update
      if (!video) {
        console.error(`[Worker] Video document ${videoId} not found after update - may have been deleted`);
        throw new Error("Video document was deleted during processing");
      }

      // 3. Cleanup local source file on success
      if (fs.existsSync(videoPath)) {
        try {
          await fs.promises.unlink(videoPath);
          console.log(`[Worker] Cleaned up local file ${videoPath}`);
        } catch (cleanupErr) {
          // Log but don't throw - cleanup failure shouldn't fail the job
          console.warn(`[Worker] Failed to cleanup video file ${videoPath}:`, cleanupErr.message);
        }
      }
      
      console.log(`[Worker] Job ${job.id} finished successfully for video ${videoId}`);
      return video;
    } catch (error) {
      console.error(`[Worker] Failed to process video ${videoId} (Job ${job.id}):`, error);

      await Video.findByIdAndUpdate(videoId, {
        status: "failed",
        uploadStatus: "failed",
        errorMessage: error.message,
      });
      console.log(`[Worker] Updated status to 'failed' for video ${videoId}`);

      // Cleanup local file on failure if it still exists
      if (fs.existsSync(videoPath)) {
        try {
          fs.unlinkSync(videoPath);
          console.log(`[Worker] Cleaned up local file ${videoPath} after failure`);
        } catch (cleanupErr) {
          console.error("Failed to cleanup video file:", cleanupErr);
        }
      }

      throw error;
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed event received!`);
});

worker.on("failed", (job, err) => {
  if (job) {
    console.error(`[Worker] Job ${job.id} failed event received with ${err.message}`);
  } else {
    console.error(`[Worker] Job failed with error: ${err?.message || "Unknown error"}`);
  }
});

export default worker;
