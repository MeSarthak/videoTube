import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { processVideo } from "../utils/videoProcessor.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import fs from "fs";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const isSecure = redisUrl.startsWith("rediss://");

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  connectTimeout: 20000,
  retryStrategy: function (times) {
    return Math.min(times * 100, 3000); // Increased retry delay slightly
  },
  tls: isSecure
    ? {
        servername: new URL(redisUrl).hostname,
        rejectUnauthorized: false,
      }
    : undefined,
});

connection.on("error", (err) => {
  console.error(`[Worker] Redis connection error: ${err.message}`);
});

const worker = new Worker(
  "video-processing",
  async (job) => {
    const { videoPath, videoId, userId, title, description } = job.data;
    console.log(`[Worker] Processing video ${videoId}...`);

    try {
      // Update status to processing
      await Video.findByIdAndUpdate(videoId, {
        status: "processing",
        uploadStatus: "processing",
      });

      // 1. Process Video
      const { masterUrl, variants, thumbnailUrl, duration } =
        await processVideo(videoPath);

      if (!masterUrl || !variants) {
        throw new Error("Video processing pipeline failed");
      }

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

      console.log(`[Worker] Video ${videoId} processed successfully.`);
      return video;
    } catch (error) {
      console.error(`[Worker] Failed to process video ${videoId}:`, error);

      await Video.findByIdAndUpdate(videoId, {
        status: "failed",
        uploadStatus: "failed",
        errorMessage: error.message,
      });

      // Cleanup local file on failure if it still exists
      if (fs.existsSync(videoPath)) {
        try {
          fs.unlinkSync(videoPath);
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
  console.log(`[Worker] Job ${job.id} completed!`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job.id} failed with ${err.message}`);
});

export default worker;
