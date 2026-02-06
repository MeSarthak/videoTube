import { Router } from "express";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public route - GET comments
router.route("/:videoId").get(getVideoComments);

// Protected routes - POST/PATCH/DELETE
router.route("/:videoId").post(verifyJWT, addComment);
router.route("/c/:commentId").delete(verifyJWT, deleteComment).patch(verifyJWT, updateComment);

export const commentRouter = router;
