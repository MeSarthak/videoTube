import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { uploadHLSVideo } from "../controllers/video.controller.js";
import { upload } from "../middlewares/memoryMulter.middleware.js";
const router = express.Router();

router.post("/upload-abr", verifyJWT, upload.single("video"), uploadHLSVideo);

export { router as videoRouter };
