import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  uploadHLSVideo,
  getVideoStatus,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/diskStorageMulter.middleware.js";
const router = express.Router();

router.post("/upload-abr", verifyJWT, upload.single("video"), uploadHLSVideo);
router.get("/status/:videoId", verifyJWT, getVideoStatus);

export { router as videoRouter };
