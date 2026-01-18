import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://video-tube-git-frontend-mesarthaks-projects.vercel.app/",
  process.env.CORS_ORIGIN,
];

// Use CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin, such as mobile apps or curl requests
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true); // Origin is allowed
      } else {
        callback(new Error("Not allowed by CORS")); // Origin is not allowed
      }
    },
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
app.use(cookieParser());

//import routes
import { userRouter } from "./routes/user.routes.js";
import { videoRouter } from "./routes/video.routes.js";

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    statusCode: 200,
    message: "Server is healthy",
    success: true,
  });
});

//use routes
app.use("/api/v1/users", userRouter); //http://localhost:5000/api/v1/users/....
app.use("/api/v1/videos", videoRouter); //http://localhost:5000/api/v1/videos/....

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    statusCode,
    message,
    success: false,
    errors: err.errors || [],
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    statusCode: 404,
    message: "Route not found",
    success: false,
  });
});

export default app;
