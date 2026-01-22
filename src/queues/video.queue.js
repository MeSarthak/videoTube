import { Queue } from "bullmq";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

console.log(
  `[Queue] Attempting to connect to Redis at: ${redisUrl.replace(/:[^:@]*@/, ":****@")}`
);

// Parse the URL to check if it's secure (rediss://)
const isSecure = redisUrl.startsWith("rediss://");

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  connectTimeout: 20000, // Increase to 20s
  tls: isSecure
    ? {
        servername: new URL(redisUrl).hostname,
        rejectUnauthorized: false,
      }
    : undefined,
  // Removed family: 4 to let ioredis/node resolve automatically, as forcing it might be failing if the environment is strictly IPv6 or has specific DNS resolution paths.
});

connection.on("error", (err) => {
  console.error(`[Queue] Redis connection error: ${err.message}`);
  if (err.message.includes("ETIMEDOUT")) {
    console.error(
      "Hint: Check your Azure Redis Firewall settings. Ensure the App Service IP is allowed."
    );
  }
});

connection.on("connect", () => {
  console.log("[Queue] Redis connected successfully");
});

export const videoQueue = new Queue("video-processing", { connection });

export const addVideoToQueue = async (videoData) => {
  return await videoQueue.add("process-video", videoData, {
    removeOnComplete: true,
    removeOnFail: false,
  });
};
