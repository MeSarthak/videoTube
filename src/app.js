import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

app.use(express.json({
    limit: "16kb"
}));
app.use(express.urlencoded({ extended: true,  limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//import routes
import { userRouter  } from "./routes/user.routes.js";
import { videoRouter  } from "./routes/video.routes.js";

//use routes

app.use("/health-check", (req, res) => {
    res.status(200).json({
        statusCode: 200,
        message: "API is running...",
        success: true
    });
});
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
        errors: err.errors || []
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        statusCode: 404,
        message: "Route not found",
        success: false
    });
});

export default app;