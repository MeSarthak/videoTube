import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";

const router = express.Router();

// Public routes - GET
router.route("/:playlistId").get(getPlaylistById);
router.route("/user/:userId").get(getUserPlaylists);

// Protected routes - POST/PATCH/DELETE
router.route("/").post(verifyJWT, createPlaylist);
router.route("/:playlistId").patch(verifyJWT, updatePlaylist);
router.route("/:playlistId").delete(verifyJWT, deletePlaylist);
router.route("/add/:videoId/:playlistId").patch(verifyJWT, addVideoToPlaylist);
router.route("/remove/:videoId/:playlistId").patch(verifyJWT, removeVideoFromPlaylist);

export { router as playlistRouter };
