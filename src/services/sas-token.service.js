/**
 * SAS Token Service
 * Handles secure, fine-grained generation of SAS tokens for Azure Blob Storage
 * - Implements short expiration times for security
 * - Restricts permissions to specific resources and operations
 * - Provides refresh capability
 */

import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { ApiError } from "../utils/ApiError.js";

class SASTokenService {
  constructor() {
    this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    this.containerName = process.env.CONTAINER_NAME || "videos";

    if (!this.connectionString) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
    }

    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      this.connectionString
    );

    // Parse connection string for account name and key
    this.accountInfo = this._parseConnectionString(this.connectionString);
    if (!this.accountInfo.accountName || !this.accountInfo.accountKey) {
      throw new Error(
        "Failed to parse account credentials from connection string"
      );
    }
  }

  /**
   * Parse Azure connection string
   */
  _parseConnectionString(connStr) {
    const parts = connStr.split(";").reduce((acc, part) => {
      const [key, ...valueParts] = part.split("=");
      if (key) acc[key] = valueParts.join("=");
      return acc;
    }, {});

    return {
      accountName: parts.AccountName || "",
      accountKey: parts.AccountKey || "",
    };
  }

  /**
   * Generate fine-grained SAS token for READ operations
   * Used for downloading/streaming files
   *
   * @param {String} blobName - The blob identifier (filename/path in storage)
   * @param {Object} options - Configuration options
   * @param {Number} options.expiresInSeconds - Token expiration time (default: 1 hour)
   * @param {String} options.container - Azure container name (default: configured container)
   * @returns {Object} { sasUrl, expiresAt, expiresIn }
   */
  generateReadSASUrl(blobName, options = {}) {
    try {
      const expiresInSeconds = options.expiresInSeconds || 60 * 60; // 1 hour default
      const container = options.container || this.containerName;

      if (!blobName) {
        throw new ApiError(400, "Blob name is required");
      }

      // Validate blob name format
      if (!/^[\w\-\.\/]+$/.test(blobName)) {
        throw new ApiError(400, "Invalid blob name format");
      }

      const sharedKeyCredential = new StorageSharedKeyCredential(
        this.accountInfo.accountName,
        this.accountInfo.accountKey
      );

      const now = new Date();
      const expiresOn = new Date(now.valueOf() + expiresInSeconds * 1000);

      const sasOptions = {
        containerName: container,
        blobName,
        permissions: BlobSASPermissions.parse("r"), // READ ONLY
        startsOn: now,
        expiresOn,
        protocol: "https",
      };

      const sasToken = generateBlobSASQueryParameters(
        sasOptions,
        sharedKeyCredential
      ).toString();

      const sasUrl = `https://${this.accountInfo.accountName}.blob.core.windows.net/${container}/${blobName}?${sasToken}`;

      return {
        sasUrl,
        expiresAt: expiresOn.toISOString(),
        expiresIn: expiresInSeconds,
        permissions: "r",
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Error generating read SAS URL:", error);
      throw new ApiError(
        500,
        "Failed to generate SAS URL for download",
        error.message
      );
    }
  }

  /**
   * Generate fine-grained SAS token for WRITE operations
   * Used for uploading files by authorized users
   *
   * @param {String} blobName - The blob identifier (filename/path in storage)
   * @param {Object} options - Configuration options
   * @param {Number} options.expiresInSeconds - Token expiration time (default: 15 minutes)
   * @param {String} options.container - Azure container name (default: configured container)
   * @returns {Object} { sasUrl, expiresAt, expiresIn }
   */
  generateWriteSASUrl(blobName, options = {}) {
    try {
      // Write tokens should have shorter expiration for security
      let expiresInSeconds = options.expiresInSeconds || 15 * 60; // 15 minutes default
      const maxExpirySeconds = 24 * 60 * 60; // 24 hours max
      expiresInSeconds = Math.min(expiresInSeconds, maxExpirySeconds);
      const container = options.container || this.containerName;

      if (!blobName) {
        throw new ApiError(400, "Blob name is required");
      }

      if (!/^[\w\-\.\/]+$/.test(blobName)) {
        throw new ApiError(400, "Invalid blob name format");
      }

      const sharedKeyCredential = new StorageSharedKeyCredential(
        this.accountInfo.accountName,
        this.accountInfo.accountKey
      );

      const now = new Date();
      const expiresOn = new Date(now.valueOf() + expiresInSeconds * 1000);

      const sasOptions = {
        containerName: container,
        blobName,
        permissions: BlobSASPermissions.parse("cw"), // CREATE + WRITE (no DELETE)
        startsOn: now,
        expiresOn,
        protocol: "https",
      };

      const sasToken = generateBlobSASQueryParameters(
        sasOptions,
        sharedKeyCredential
      ).toString();

      const sasUrl = `https://${this.accountInfo.accountName}.blob.core.windows.net/${container}/${blobName}?${sasToken}`;

      return {
        sasUrl,
        expiresAt: expiresOn.toISOString(),
        expiresIn: expiresInSeconds,
        permissions: "cw",
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Error generating write SAS URL:", error);
      throw new ApiError(
        500,
        "Failed to generate SAS URL for upload",
        error.message
      );
    }
  }

  /**
   * Generate SAS URL for HLS manifest/playlist files (READ ONLY)
   * Special handling for M3U8 playlists which require READ + LIST permissions
   *
   * @param {String} blobName - The blob identifier
   * @param {Object} options - Configuration options
   * @returns {Object} { sasUrl, expiresAt, expiresIn }
   */
  generateHLSPlaylistSASUrl(blobName, options = {}) {
    try {
      // Playlist tokens can be longer-lived since they're read-only
      const expiresInSeconds = options.expiresInSeconds || 24 * 60 * 60; // 24 hours
      const container = options.container || this.containerName;

      if (!blobName) {
        throw new ApiError(400, "Blob name is required");
      }

      const sharedKeyCredential = new StorageSharedKeyCredential(
        this.accountInfo.accountName,
        this.accountInfo.accountKey
      );

      const now = new Date();
      const expiresOn = new Date(now.valueOf() + expiresInSeconds * 1000);

      const sasOptions = {
        containerName: container,
        blobName,
        permissions: BlobSASPermissions.parse("r"), // READ ONLY
        startsOn: now,
        expiresOn,
        protocol: "https",
      };

      const sasToken = generateBlobSASQueryParameters(
        sasOptions,
        sharedKeyCredential
      ).toString();

      const sasUrl = `https://${this.accountInfo.accountName}.blob.core.windows.net/${container}/${blobName}?${sasToken}`;

      return {
        sasUrl,
        expiresAt: expiresOn.toISOString(),
        expiresIn: expiresInSeconds,
        permissions: "r",
        contentType: "application/x-mpegURL",
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Error generating HLS playlist SAS URL:", error);
      throw new ApiError(
        500,
        "Failed to generate SAS URL for HLS playlist",
        error.message
      );
    }
  }

  /**
   * Validate SAS token expiration
   * Used by frontend to determine if a token needs refresh
   *
   * @param {String} sasUrl - The full SAS URL to validate
   * @returns {Object} { isExpired, expiresAt, timeRemaining }
   */
  validateSASTokenExpiry(sasUrl) {
    try {
      if (!sasUrl) {
        throw new ApiError(400, "SAS URL is required");
      }

      // Extract expiry (se) parameter from SAS URL
      const urlParams = new URL(sasUrl);
      const seParam = urlParams.searchParams.get("se");

      if (!seParam) {
        throw new ApiError(400, "Invalid SAS URL: missing expiry parameter");
      }

      const expiresAt = new Date(seParam);
      const now = new Date();
      const timeRemaining = Math.floor((expiresAt - now) / 1000); // in seconds

      return {
        isExpired: timeRemaining <= 0,
        expiresAt: expiresAt.toISOString(),
        timeRemaining,
        shouldRefresh: timeRemaining < 5 * 60, // Suggest refresh if less than 5 minutes left
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Error validating SAS token expiry:", error);
      throw new ApiError(400, "Invalid SAS URL format", error.message);
    }
  }

  /**
   * Generate SAS URL with custom permissions and expiry
   * For advanced use cases - ensure permissions are validated
   *
   * @param {String} blobName - The blob identifier
   * @param {Object} options - Configuration options
   * @param {String} options.permissions - Permissions string (r|cw|cd|racwd etc)
   * @param {Number} options.expiresInSeconds - Token expiration time
   * @param {String} options.container - Azure container name
   * @returns {Object} { sasUrl, expiresAt, expiresIn, permissions }
   */
  generateCustomSASUrl(blobName, options = {}) {
    try {
      const {
        permissions = "r",
        expiresInSeconds = 60 * 60,
        container = this.containerName,
      } = options;

      if (!blobName) {
        throw new ApiError(400, "Blob name is required");
      }

      // Validate permissions - restrict to safe operations
      const allowedPermissions = [
        "r",
        "c",
        "w",
        "d",
        "rc",
        "rw",
        "cd",
        "cw",
        "cwd",
        "rcd",
        "rcw",
        "rcwd",
      ];
      const permKey = permissions.split("").sort().join("");

      if (!allowedPermissions.includes(permKey)) {
        throw new ApiError(
          400,
          `Invalid permissions: ${permissions}. Allowed: r, c, w, d and combinations`
        );
      }

      // Enforce max expiry for security
      const maxExpirySeconds = 24 * 60 * 60; // 24 hours
      const finalExpiry = Math.min(expiresInSeconds, maxExpirySeconds);

      const sharedKeyCredential = new StorageSharedKeyCredential(
        this.accountInfo.accountName,
        this.accountInfo.accountKey
      );

      const now = new Date();
      const expiresOn = new Date(now.valueOf() + finalExpiry * 1000);

      const sasOptions = {
        containerName: container,
        blobName,
        permissions: BlobSASPermissions.parse(permissions),
        startsOn: now,
        expiresOn,
        protocol: "https",
      };

      const sasToken = generateBlobSASQueryParameters(
        sasOptions,
        sharedKeyCredential
      ).toString();

      const sasUrl = `https://${this.accountInfo.accountName}.blob.core.windows.net/${container}/${blobName}?${sasToken}`;

      return {
        sasUrl,
        expiresAt: expiresOn.toISOString(),
        expiresIn: finalExpiry,
        permissions,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Error generating custom SAS URL:", error);
      throw new ApiError(500, "Failed to generate SAS URL", error.message);
    }
  }
}

export const sasTokenService = new SASTokenService();
