import { Queue } from "bullmq";
import { Redis } from "ioredis";

const connection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  }
);

export const videoQueue = new Queue("video-processing", { connection });

export const addVideoToQueue = async (videoData) => {
  return await videoQueue.add("process-video", videoData, {
    removeOnComplete: true,
    removeOnFail: false,
  });
};
