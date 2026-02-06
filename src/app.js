import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import fs from "fs/promises";

// Rate limiting middleware
import {
  generalLimiter,
} from "./middlewares/rateLimiter.middleware.js";

// Initialize temp directory asynchronously
const initializeTempDir = async () => {
  const tempDir = "./public/temp";
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (err) {
    console.error(`Failed to create temp directory at ${tempDir}:`, err.message);
  }
};

// Initialize temp directory on startup
initializeTempDir();

// Validate CORS_ORIGIN with safe defaults
const validateCorsOrigin = () => {
  const corsOrigin = process.env.CORS_ORIGIN;
  
  // If no CORS_ORIGIN specified, use false (deny all) for security
  if (!corsOrigin) {
    console.warn(
      "[CORS] No CORS_ORIGIN configured. Using permissive setting. Please set CORS_ORIGIN environment variable in production."
    );
    return process.env.NODE_ENV === "production" ? false : "*";
  }
  
  // Validate it's not a wildcard in production
  if (corsOrigin === "*" && process.env.NODE_ENV === "production") {
    console.error(
      "[CORS] Wildcard '*' is not allowed in production. Set CORS_ORIGIN to specific domain(s)."
    );
    process.exit(1);
  }
  
  return corsOrigin;
};

const corsOrigin = validateCorsOrigin();

const app = express();

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "16kb",
  })
);
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Range"
  );
  next();
});
app.use(cookieParser());

// Apply general rate limiting to all routes
app.use(generalLimiter);

//import routes
import { userRouter } from "./routes/user.routes.js";
import { videoRouter } from "./routes/video.routes.js";
import { subscriptionRouter } from "./routes/subscription.routes.js";
import { likeRouter } from "./routes/like.routes.js";
import { commentRouter } from "./routes/comment.routes.js";
import { playlistRouter } from "./routes/playlist.routes.js";
import { tweetRouter } from "./routes/tweet.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { notificationRouter } from "./routes/notification.routes.js";
import { sasTokenRouter } from "./routes/sas-token.routes.js";

//use routes

app.use("/health-check", (req, res) => {
  res.status(200).json({
    statusCode: 200,
    message: "API is running...",
    success: true,
  });
});
app.use("/api/v1/users", userRouter); //http://localhost:5000/api/v1/users/....
app.use("/api/v1/videos", videoRouter); //http://localhost:5000/api/v1/videos/....
app.use("/api/v1/sas-tokens", sasTokenRouter); //http://localhost:5000/api/v1/sas-tokens/....
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/notifications", notificationRouter);


// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  // Log server errors for debugging
  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] Error ${statusCode}:`, err);
    // Don't expose internal error details to client
    message = "Internal Server Error";
    errors = [];
  }

  res.status(statusCode).json({
    statusCode,
    message,
    success: false,
    errors,
  });
});
app.use((req, res) => {
  res.status(404).json({
    statusCode: 404,
    message: "Route not found",
    success: false,
  });
});

export default app;
export { initializeTempDir };
