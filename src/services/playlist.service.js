import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";

class PlaylistService {
  async createPlaylist({ name, description, ownerId }) {
    if (!name) throw new ApiError(400, "Playlist name is required");

    // Validate ownerId format
    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      throw new ApiError(400, "Invalid owner ID format");
    }

    const playlist = await Playlist.create({
      name,
      description: description || "",
      owner: ownerId,
      videos: [],
    });

    return playlist;
  }

  async getUserPlaylists(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid User ID");
    }

    const playlists = await Playlist.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          createdAt: 1,
          updatedAt: 1,
          totalVideos: { $size: "$videos" },
          firstVideo: { $arrayElemAt: ["$videos", 0] }, // Just to maybe fetch thumbnail later
        },
      },
    ]);

    return playlists;
  }

  async getPlaylistById(playlistId) {
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      throw new ApiError(400, "Invalid Playlist ID");
    }

    const playlist = await Playlist.findById(playlistId)
      .populate({
        path: "videos",
        select: "title thumbnail duration views owner createdAt",
        populate: {
          path: "owner",
          select: "username fullname avatar",
        },
      })
      .populate("owner", "username fullname avatar");

    if (!playlist) {
      throw new ApiError(404, "Playlist not found");
    }

    // Filter out videos that might have been deleted but ID remains in array (optional sanity check)
    playlist.videos = playlist.videos.filter((v) => v !== null);

    return playlist;
  }

  async addVideoToPlaylist(playlistId, videoId, userId) {
    if (
      !mongoose.Types.ObjectId.isValid(playlistId) ||
      !mongoose.Types.ObjectId.isValid(videoId)
    ) {
      throw new ApiError(400, "Invalid Playlist or Video ID");
    }

    // Atomic update: include ownership check in the query to avoid TOCTOU race
    const updatedPlaylist = await Playlist.findOneAndUpdate(
      {
        _id: playlistId,
        owner: userId, // Verify ownership in atomic query
        videos: { $ne: videoId }, // Ensure video is not already in the array
      },
      {
        $addToSet: { videos: videoId },
      },
      { new: true }
    ).populate("videos", "_id title");

    if (!updatedPlaylist) {
      // Determine which condition failed for better error message
      const playlist = await Playlist.findById(playlistId);
      
      if (!playlist) {
        throw new ApiError(404, "Playlist not found");
      }

      if (playlist.owner.toString() !== userId.toString()) {
        throw new ApiError(
          403,
          "You do not have permission to modify this playlist"
        );
      }

      // Check if video exists
      const videoExists = await Video.findById(videoId).select("_id");
      if (!videoExists) {
        throw new ApiError(404, "Video not found");
      }

      // If video exists but update returned null, video is already in playlist
      throw new ApiError(400, "Video already exists in this playlist");
    }

    return updatedPlaylist;
  }

  async removeVideoFromPlaylist(playlistId, videoId, userId) {
    if (
      !mongoose.Types.ObjectId.isValid(playlistId) ||
      !mongoose.Types.ObjectId.isValid(videoId)
    ) {
      throw new ApiError(400, "Invalid Playlist or Video ID");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    if (playlist.owner.toString() !== userId.toString()) {
      throw new ApiError(
        403,
        "You do not have permission to modify this playlist"
      );
    }

    // Use atomic $pull update instead of mutating and saving
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      { $pull: { videos: videoId } },
      { new: true }
    );

    return updatedPlaylist;
  }

  async deletePlaylist(playlistId, userId) {
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      throw new ApiError(400, "Invalid Playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    if (playlist.owner.toString() !== userId.toString()) {
      throw new ApiError(
        403,
        "You do not have permission to delete this playlist"
      );
    }

    await Playlist.findByIdAndDelete(playlistId);

    return { message: "Playlist deleted successfully" };
  }

  async updatePlaylist(playlistId, { name, description }, userId) {
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      throw new ApiError(400, "Invalid Playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    if (playlist.owner.toString() !== userId.toString()) {
      throw new ApiError(
        403,
        "You do not have permission to update this playlist"
      );
    }

    if (name) playlist.name = name;
    if (description !== undefined) playlist.description = description;

    await playlist.save();

    return playlist;
  }
}

export const playlistService = new PlaylistService();
