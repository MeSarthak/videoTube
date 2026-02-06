/**
 * SAS Token Routes
 * Public endpoints for frontend to obtain SAS tokens for cloud storage operations
 */

import express from "express";
import {
  getSASTokenForDownload,
  getSASTokenForUpload,
  getSASTokenForHLSPlaylist,
  validateSASTokenExpiry,
  refreshSASToken,
} from "../controllers/sas-token.controller.js";
import {
  verifyJWT,
  optionalVerifyJWT,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * GET /api/v1/sas-tokens/download/:videoId
 * Get SAS token for downloading/streaming video content
 * Public endpoint (optional authentication)
 *
 * Query params:
 *   - expiresInSeconds: Custom expiry time (default: 1 hour)
 *
 * Response:
 *   {
 *     "sasUrl": "https://...",
 *     "expiresAt": "2024-01-15T10:00:00Z",
 *     "expiresIn": 3600,
 *     "permissions": "r"
 *   }
 */
router.get("/download/:videoId", optionalVerifyJWT, getSASTokenForDownload);

/**
 * GET /api/v1/sas-tokens/upload/:videoId
 * Get SAS token for uploading files (for video owner only)
 * Requires authentication
 *
 * Query params:
 *   - blobPath: Path where file should be uploaded
 *   - expiresInSeconds: Custom expiry time (default: 15 minutes)
 *
 * Response:
 *   {
 *     "sasUrl": "https://...",
 *     "expiresAt": "2024-01-15T10:15:00Z",
 *     "expiresIn": 900,
 *     "permissions": "cw"
 *   }
 */
router.get("/upload/:videoId", verifyJWT, getSASTokenForUpload);

/**
 * GET /api/v1/sas-tokens/hls-playlist/:videoId/:playlistName
 * Get SAS token for HLS playlist/manifest files
 * Public endpoint (optional authentication)
 *
 * Query params:
 *   - expiresInSeconds: Custom expiry time (default: 24 hours)
 *
 * Response:
 *   {
 *     "sasUrl": "https://...",
 *     "expiresAt": "2024-01-16T10:00:00Z",
 *     "expiresIn": 86400,
 *     "permissions": "r",
 *     "contentType": "application/x-mpegURL"
 *   }
 */
router.get("/hls-playlist/:videoId/:playlistName", optionalVerifyJWT, getSASTokenForHLSPlaylist);

/**
 * POST /api/v1/sas-tokens/validate
 * Validate SAS token expiry and determine if refresh is needed
 * Public endpoint
 *
 * Request body:
 *   {
 *     "sasUrl": "https://..."
 *   }
 *
 * Response:
 *   {
 *     "isExpired": false,
 *     "expiresAt": "2024-01-15T10:00:00Z",
 *     "timeRemaining": 1800,
 *     "shouldRefresh": false
 *   }
 */
router.post("/validate", validateSASTokenExpiry);

/**
 * POST /api/v1/sas-tokens/refresh
 * Refresh an expiring or expired SAS token
 * For downloads (public), for uploads (authenticated)
 *
 * Request body:
 *   {
 *     "videoId": "...",
 *     "type": "download|upload|hls",
 *     "blobPath": "..." (required for upload/hls)
 *   }
 *
 * Response:
 *   {
 *     "sasUrl": "https://...",
 *     "expiresAt": "2024-01-15T10:00:00Z",
 *     "expiresIn": 3600
 *   }
 */
router.post("/refresh", optionalVerifyJWT, refreshSASToken);

export { router as sasTokenRouter };
