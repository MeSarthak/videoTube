import express from "express";
import {
  verifyJWT,
  optionalVerifyJWT,
} from "../middlewares/auth.middleware.js";
import {
  uploadHLSVideo,
  getVideoStatus,
  getAllVideos,
  getVideoById,
  incrementViewCount,
  getRelatedVideos,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/diskStorageMulter.middleware.js";
const router = express.Router();

router.post(
  "/upload-abr",
  verifyJWT,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  uploadHLSVideo
);
router.get("/status/:videoId", verifyJWT, getVideoStatus);

// Public Routes (Optional Auth for some)
router.get("/", getAllVideos);
router.get("/:videoId", optionalVerifyJWT, getVideoById);
router.get("/:videoId/related", getRelatedVideos);
router.patch("/:videoId/views", incrementViewCount);

export { router as videoRouter };
