/**
 * SAS Token Controller
 * Handles HTTP requests for SAS token generation and management
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { sasTokenService } from "../services/sas-token.service.js";
import { Video } from "../models/video.model.js";
import {
  validateSASTokenRequest,
  createCloudErrorResponse,
  CloudErrorCodes,
  withCloudRetry,
} from "../utils/cloudErrorHandler.js";

/**
 * Helper function to sanitize blob paths to prevent path traversal
 */
const sanitizeBlobPath = (blobPath) => {
  if (!blobPath || typeof blobPath !== "string") {
    return null;
  }
  // Decode URL encoding safely
  try {
    let decoded = decodeURIComponent(blobPath);
    // Normalize path
    const normalized = decoded.split(/[\\/]+/).filter(p => p && p !== "." && p !== "..");
    // Reject if any .. segments found
    if (normalized.join("/") !== decoded.split(/[\\/]+/).filter(p => p).join("/")) {
      return null;
    }
    return normalized.join("/");
  } catch (err) {
    // Invalid percent-encoding or decoding error
    return null;
  }
};

/**
 * Helper function to validate blob path references intended video
 */
const validateBlobPathForVideo = (blobPath, videoId) => {
  if (!blobPath || !blobPath.startsWith(videoId + "/")) {
    return false;
  }
  return true;
};

/**
 * Get SAS token for downloading/streaming video content
 * Anyone can get a download token, but we should restrict to published videos
 */
const getSASTokenForDownload = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { expiresInSeconds } = req.query;

  // Validate video exists and is published
  const video = await Video.findById(videoId).select(
    "status isPublished masterPlaylist"
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (!video.isPublished || video.status !== "published") {
    throw new ApiError(403, "Video is not available for download");
  }

  if (!video.masterPlaylist) {
    throw new ApiError(
      400,
      "Video processing is not complete. Master playlist not available."
    );
  }

  // Parse and validate expiry time
  let expirySeconds = 60 * 60; // 1 hour default for download
  if (expiresInSeconds) {
    const parsed = parseInt(expiresInSeconds, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new ApiError(400, "expiresInSeconds must be a positive integer");
    }
    // Cap at 24 hours for downloads
    expirySeconds = Math.min(parsed, 24 * 60 * 60);
  }

  // Validate blob path
  const blobName = video.masterPlaylist;
  const validation = validateSASTokenRequest(blobName, {
    expiresInSeconds: expirySeconds,
  });

  if (!validation.isValid) {
    throw new ApiError(
      400,
      `Invalid blob path: ${validation.errors[0].message}`
    );
  }

  try {
    // Use retry wrapper for cloud operations
    const result = await withCloudRetry(() =>
      Promise.resolve(
        sasTokenService.generateReadSASUrl(blobName, {
          expiresInSeconds: expirySeconds,
        })
      )
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          sasUrl: result.sasUrl,
          expiresAt: result.expiresAt,
          expiresIn: result.expiresIn,
          permissions: result.permissions,
          videoId,
          blobName,
        },
        "Download SAS token generated successfully"
      )
    );
  } catch (error) {
    const errorResponse = createCloudErrorResponse(
      error,
      "download_token_generation"
    );
    throw new ApiError(
      errorResponse.statusCode,
      errorResponse.message,
      errorResponse.errorCode
    );
  }
});

/**
 * Get SAS token for uploading files (authenticated users only)
 * Only video owner can get upload tokens
 */
const getSASTokenForUpload = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { blobPath, expiresInSeconds } = req.query;
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Authentication required to get upload SAS token");
  }

  // Validate video exists and user is the owner
  const video = await Video.findById(videoId).select("owner");

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "Only video owner can get upload tokens");
  }

  if (!blobPath) {
    throw new ApiError(400, "blobPath is required for upload tokens");
  }

  // Sanitize and validate blob path to prevent path traversal
  const sanitized = sanitizeBlobPath(blobPath);
  if (!sanitized || !validateBlobPathForVideo(sanitized, videoId)) {
    throw new ApiError(400, "Invalid blob path: path traversal not allowed");
  }

  // Parse and validate expiry time
  let expirySeconds = 15 * 60; // 15 minutes default for upload (shorter for security)
  if (expiresInSeconds) {
    const parsed = parseInt(expiresInSeconds, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new ApiError(400, "expiresInSeconds must be a positive integer");
    }
    // Cap at 1 hour for upload safety
    expirySeconds = Math.min(parsed, 60 * 60);
  }

  // Validate blob path
  const validation = validateSASTokenRequest(sanitized, {
    expiresInSeconds: expirySeconds,
  });

  if (!validation.isValid) {
    throw new ApiError(
      400,
      `Invalid blob path: ${validation.errors[0].message}`
    );
  }

  try {
    const result = await withCloudRetry(() =>
      Promise.resolve(
        sasTokenService.generateWriteSASUrl(sanitized, {
          expiresInSeconds: expirySeconds,
        })
      )
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          sasUrl: result.sasUrl,
          expiresAt: result.expiresAt,
          expiresIn: result.expiresIn,
          permissions: result.permissions,
          videoId,
          blobPath: sanitized,
        },
        "Upload SAS token generated successfully"
      )
    );
  } catch (error) {
    const errorResponse = createCloudErrorResponse(
      error,
      "upload_token_generation"
    );
    throw new ApiError(
      errorResponse.statusCode,
      errorResponse.message,
      errorResponse.errorCode
    );
  }
});

/**
 * Get SAS token for HLS playlist files
 * Anyone can get playlist tokens for published videos
 */
const getSASTokenForHLSPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistName } = req.params;
  const { expiresInSeconds } = req.query;

  // Validate video exists and is published
  const video = await Video.findById(videoId).select("status isPublished");

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (!video.isPublished || video.status !== "published") {
    throw new ApiError(403, "Video is not available");
  }

  if (!playlistName) {
    throw new ApiError(400, "Playlist name is required");
  }

  // Sanitize and validate playlistName to prevent path traversal
  const allowedPlaylistRegex = /^[a-zA-Z0-9._-]+$/;
  if (!allowedPlaylistRegex.test(playlistName)) {
    throw new ApiError(400, "Invalid playlist name: only alphanumeric, dots, hyphens, and underscores allowed");
  }

  // Construct blob path
  const blobName = `${videoId}/${playlistName}`;

  // Parse and validate expiry time
  let expirySeconds = 24 * 60 * 60; // 24 hours default for HLS playlists (longer, read-only)
  if (expiresInSeconds) {
    const parsed = parseInt(expiresInSeconds, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new ApiError(400, "expiresInSeconds must be a positive integer");
    }
    // Cap at 7 days for HLS playlists
    expirySeconds = Math.min(parsed, 7 * 24 * 60 * 60);
  }

  // Validate blob path
  const validation = validateSASTokenRequest(blobName, {
    expiresInSeconds: expirySeconds,
  });

  if (!validation.isValid) {
    throw new ApiError(
      400,
      `Invalid playlist path: ${validation.errors[0].message}`
    );
  }

  try {
    const result = await withCloudRetry(() =>
      Promise.resolve(
        sasTokenService.generateHLSPlaylistSASUrl(blobName, {
          expiresInSeconds: expirySeconds,
        })
      )
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          sasUrl: result.sasUrl,
          expiresAt: result.expiresAt,
          expiresIn: result.expiresIn,
          permissions: result.permissions,
          contentType: result.contentType,
          videoId,
          playlistName,
        },
        "HLS playlist SAS token generated successfully"
      )
    );
  } catch (error) {
    const errorResponse = createCloudErrorResponse(
      error,
      "hls_token_generation"
    );
    throw new ApiError(
      errorResponse.statusCode,
      errorResponse.message,
      errorResponse.errorCode
    );
  }
});

/**
 * Validate if a SAS token is expired or needs refresh
 * Public endpoint - returns token status information
 */
const validateSASTokenExpiry = asyncHandler(async (req, res) => {
  const { sasUrl } = req.body;

  if (!sasUrl) {
    throw new ApiError(400, "sasUrl is required in request body");
  }

  try {
    const validationResult = sasTokenService.validateSASTokenExpiry(sasUrl);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          isExpired: validationResult.isExpired,
          expiresAt: validationResult.expiresAt,
          timeRemaining: validationResult.timeRemaining,
          shouldRefresh: validationResult.shouldRefresh,
          timestamp: new Date().toISOString(),
        },
        "SAS token validity checked successfully"
      )
    );
  } catch (error) {
    throw new ApiError(400, "Invalid SAS URL format or validation failed");
  }
});

/**
 * Refresh an expiring or expired SAS token
 * Requires original token context (videoId, type, blobPath)
 */
const refreshSASToken = asyncHandler(async (req, res) => {
  const { videoId, type, blobPath } = req.body;
  const userId = req.user?._id;

  if (!videoId) {
    throw new ApiError(400, "videoId is required");
  }

  if (!type || !["download", "upload", "hls"].includes(type)) {
    throw new ApiError(400, "type must be 'download', 'upload', or 'hls'");
  }

  // Get video to verify it exists
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Authorization checks based on type
  let sanitizedBlobPath = null;
  
  if (type === "upload") {
    if (!userId) {
      throw new ApiError(
        401,
        "Authentication required for upload token refresh"
      );
    }
    if (video.owner.toString() !== userId.toString()) {
      throw new ApiError(403, "Only video owner can refresh upload tokens");
    }
    if (!blobPath) {
      throw new ApiError(400, "blobPath is required for upload token refresh");
    }
    // Sanitize and validate blob path
    sanitizedBlobPath = sanitizeBlobPath(blobPath);
    if (!sanitizedBlobPath || !validateBlobPathForVideo(sanitizedBlobPath, videoId)) {
      throw new ApiError(400, "Invalid blob path: path traversal not allowed");
    }
  } else if (type === "download") {
    if (!video.isPublished || video.status !== "published") {
      throw new ApiError(403, "Video is not available for download");
    }
    if (!video.masterPlaylist) {
      throw new ApiError(400, "Master playlist not available for this video");
    }
  } else if (type === "hls") {
    if (!video.isPublished || video.status !== "published") {
      throw new ApiError(403, "Video is not available for HLS streaming");
    }
    if (!blobPath) {
      throw new ApiError(400, "blobPath is required for HLS token refresh");
    }
    // Sanitize and validate blob path
    sanitizedBlobPath = sanitizeBlobPath(blobPath);
    if (!sanitizedBlobPath || !validateBlobPathForVideo(sanitizedBlobPath, videoId)) {
      throw new ApiError(400, "Invalid blob path: path traversal not allowed");
    }
  }

  try {
    let result;

    switch (type) {
      case "download":
        result = await withCloudRetry(() =>
          Promise.resolve(
            sasTokenService.generateReadSASUrl(video.masterPlaylist, {
              expiresInSeconds: 60 * 60,
            })
          )
        );
        break;

      case "upload":
        result = await withCloudRetry(() =>
          Promise.resolve(
            sasTokenService.generateWriteSASUrl(sanitizedBlobPath, {
              expiresInSeconds: 15 * 60,
            })
          )
        );
        break;

      case "hls":
        result = await withCloudRetry(() =>
          Promise.resolve(
            sasTokenService.generateHLSPlaylistSASUrl(sanitizedBlobPath, {
              expiresInSeconds: 24 * 60 * 60,
            })
          )
        );
        break;
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          sasUrl: result.sasUrl,
          expiresAt: result.expiresAt,
          expiresIn: result.expiresIn,
          permissions: result.permissions,
          videoId,
          type,
        },
        `${type} SAS token refreshed successfully`
      )
    );
  } catch (error) {
    const errorResponse = createCloudErrorResponse(
      error,
      `${type}_token_refresh`
    );
    throw new ApiError(
      errorResponse.statusCode,
      errorResponse.message,
      errorResponse.errorCode
    );
  }
});

export {
  getSASTokenForDownload,
  getSASTokenForUpload,
  getSASTokenForHLSPlaylist,
  validateSASTokenExpiry,
  refreshSASToken,
};
