/**
 * SAS Token Service Tests
 * Comprehensive tests for SAS token generation, validation, and refresh
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { sasTokenService } from "../src/services/sas-token.service.js";
import {
  validateSASTokenRequest,
  mapAzureErrorToCloudError,
  CloudErrorCodes,
} from "../src/utils/cloudErrorHandler.js";

describe("SASTokenService", () => {
  describe("generateReadSASUrl", () => {
    it("should generate a valid read SAS URL", () => {
      const blobName = "videos/test-video/master.m3u8";
      const result = sasTokenService.generateReadSASUrl(blobName);

      expect(result).toHaveProperty("sasUrl");
      expect(result).toHaveProperty("expiresAt");
      expect(result).toHaveProperty("expiresIn");
      expect(result.permissions).toBe("r");
      expect(result.sasUrl).toContain("https://");
      expect(result.sasUrl).toContain(blobName);
      expect(result.expiresIn).toBe(60 * 60); // 1 hour default
    });

    it("should generate SAS URL with custom expiry", () => {
      const blobName = "videos/test-video/master.m3u8";
      const customExpiry = 7200; // 2 hours

      const result = sasTokenService.generateReadSASUrl(blobName, {
        expiresInSeconds: customExpiry,
      });

      expect(result.expiresIn).toBe(customExpiry);
    });

    it("should include SAS query parameters in URL", () => {
      const blobName = "videos/test-video/segment.ts";
      const result = sasTokenService.generateReadSASUrl(blobName);

      // SAS URLs should have query parameters
      expect(result.sasUrl).toContain("?");
      expect(result.sasUrl).toMatch(/[?&]sv=/); // Signed version
      expect(result.sasUrl).toMatch(/[?&]sig=/); // Signature
      expect(result.sasUrl).toMatch(/[?&]se=/); // Expiry
      expect(result.sasUrl).toMatch(/[?&]sp=r/); // Permissions
    });

    it("should reject empty blob name", () => {
      expect(() => sasTokenService.generateReadSASUrl("")).toThrow();
      expect(() => sasTokenService.generateReadSASUrl(null)).toThrow();
    });

    it("should reject invalid blob name characters", () => {
      expect(() =>
        sasTokenService.generateReadSASUrl("videos/file<script>.ts")
      ).toThrow();
      expect(() =>
        sasTokenService.generateReadSASUrl("videos/file|invalid.ts")
      ).toThrow();
    });
  });

  describe("generateWriteSASUrl", () => {
    it("should generate a valid write SAS URL with CREATE+WRITE permissions", () => {
      const blobName = "videos/upload/chunk-001.ts";
      const result = sasTokenService.generateWriteSASUrl(blobName);

      expect(result).toHaveProperty("sasUrl");
      expect(result).toHaveProperty("expiresAt");
      expect(result).toHaveProperty("expiresIn");
      expect(result.permissions).toBe("cw"); // CREATE + WRITE
      expect(result.expiresIn).toBe(15 * 60); // 15 minutes default
    });

    it("should enforce shorter default expiry for write operations", () => {
      const blobName = "videos/upload/file.ts";
      const result = sasTokenService.generateWriteSASUrl(blobName);

      expect(result.expiresIn).toBeLessThan(
        sasTokenService.generateReadSASUrl(blobName).expiresIn
      );
    });

    it("should respect custom expiry for write operations", () => {
      const blobName = "videos/upload/file.ts";
      const customExpiry = 1800; // 30 minutes

      const result = sasTokenService.generateWriteSASUrl(blobName, {
        expiresInSeconds: customExpiry,
      });

      expect(result.expiresIn).toBe(customExpiry);
    });

    it("should cap maximum expiry for write operations", () => {
      const blobName = "videos/upload/file.ts";
      const unreasonableExpiry = 30 * 24 * 60 * 60; // 30 days

      const result = sasTokenService.generateWriteSASUrl(blobName, {
        expiresInSeconds: unreasonableExpiry,
      });

      // Should be capped at 24 hours
      expect(result.expiresIn).toBeLessThanOrEqual(24 * 60 * 60);
    });
  });

  describe("generateHLSPlaylistSASUrl", () => {
    it("should generate read-only SAS URL for HLS playlists", () => {
      const blobName = "videos/stream-id/master.m3u8";
      const result = sasTokenService.generateHLSPlaylistSASUrl(blobName);

      expect(result.permissions).toBe("r");
      expect(result.contentType).toBe("application/x-mpegURL");
      expect(result.expiresIn).toBe(24 * 60 * 60); // 24 hours default
    });

    it("should allow longer expiry for HLS playlists than other operations", () => {
      const blobName = "videos/stream-id/master.m3u8";
      const result = sasTokenService.generateHLSPlaylistSASUrl(blobName);

      const readTokenExpiry =
        sasTokenService.generateReadSASUrl(blobName).expiresIn;
      const writeTokenExpiry =
        sasTokenService.generateWriteSASUrl(blobName).expiresIn;

      expect(result.expiresIn).toBeGreaterThan(readTokenExpiry);
      expect(result.expiresIn).toBeGreaterThan(writeTokenExpiry);
    });
  });

  describe("validateSASTokenExpiry", () => {
    it("should identify valid non-expired tokens", () => {
      const blobName = "videos/test/file.ts";
      const sasResult = sasTokenService.generateReadSASUrl(blobName);

      const validation = sasTokenService.validateSASTokenExpiry(
        sasResult.sasUrl
      );

      expect(validation.isExpired).toBe(false);
      expect(validation.shouldRefresh).toBe(false);
      expect(validation.timeRemaining).toBeGreaterThan(0);
    });

    it("should suggest refresh for tokens expiring soon", () => {
      const blobName = "videos/test/file.ts";
      // Create a token that expires in 2 minutes (less than 5 minute threshold)
      const sasResult = sasTokenService.generateReadSASUrl(blobName, {
        expiresInSeconds: 120,
      });

      const validation = sasTokenService.validateSASTokenExpiry(
        sasResult.sasUrl
      );

      expect(validation.shouldRefresh).toBe(true);
    });

    it("should reject invalid SAS URLs", () => {
      expect(() => {
        sasTokenService.validateSASTokenExpiry("");
      }).toThrow();

      expect(() => {
        sasTokenService.validateSASTokenExpiry("https://not-a-sas-url");
      }).toThrow();
    });

    it("should extract expiry time correctly from SAS URL", () => {
      const blobName = "videos/test/file.ts";
      const sasResult = sasTokenService.generateReadSASUrl(blobName);

      const validation = sasTokenService.validateSASTokenExpiry(
        sasResult.sasUrl
      );

      // Time remaining should be roughly equal to expiresIn (within a few seconds)
      expect(
        Math.abs(validation.timeRemaining - sasResult.expiresIn)
      ).toBeLessThan(5);
    });
  });

  describe("generateCustomSASUrl", () => {
    it("should generate SAS URL with custom permissions", () => {
      const blobName = "videos/test/file.ts";
      const result = sasTokenService.generateCustomSASUrl(blobName, {
        permissions: "cw",
      });

      expect(result.permissions).toBe("cw");
      expect(result.sasUrl).toContain("sp=cw");
    });

    it("should validate permission strings", () => {
      const blobName = "videos/test/file.ts";

      // Valid permissions should work
      expect(() => {
        sasTokenService.generateCustomSASUrl(blobName, { permissions: "r" });
      }).not.toThrow();

      // Invalid permissions should throw
      expect(() => {
        sasTokenService.generateCustomSASUrl(blobName, { permissions: "xyz" });
      }).toThrow();
    });

    it("should enforce maximum expiry for security", () => {
      const blobName = "videos/test/file.ts";
      const unreasonableExpiry = 365 * 24 * 60 * 60; // 1 year

      const result = sasTokenService.generateCustomSASUrl(blobName, {
        expiresInSeconds: unreasonableExpiry,
      });

      // Should be capped at 24 hours
      expect(result.expiresIn).toBeLessThanOrEqual(24 * 60 * 60);
    });
  });

  describe("Fine-grained scoping", () => {
    it("should scope tokens to specific blobs, not entire container", () => {
      const blob1 = "videos/video1/master.m3u8";
      const blob2 = "videos/video2/master.m3u8";

      const token1 = sasTokenService.generateReadSASUrl(blob1).sasUrl;
      const token2 = sasTokenService.generateReadSASUrl(blob2).sasUrl;

      // Different blobs should have different signatures
      expect(token1).not.toContain(blob2);
      expect(token2).not.toContain(blob1);
    });

    it("should have different permissions for upload vs download", () => {
      const blobName = "videos/test/file.ts";

      const downloadToken = sasTokenService.generateReadSASUrl(blobName);
      const uploadToken = sasTokenService.generateWriteSASUrl(blobName);

      expect(downloadToken.permissions).toBe("r");
      expect(uploadToken.permissions).toBe("cw");
      expect(downloadToken.sasUrl).not.toBe(uploadToken.sasUrl);
    });
  });
});

describe("Cloud Error Handler", () => {
  describe("validateSASTokenRequest", () => {
    it("should validate correct blob names", () => {
      const result = validateSASTokenRequest("videos/video1/master.m3u8");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject missing blob names", () => {
      const result = validateSASTokenRequest("");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "blobName",
          code: CloudErrorCodes.INVALID_BLOB_NAME,
        })
      );
    });

    it("should reject overly long blob names", () => {
      const longName = "a".repeat(1025); // Over 1024 limit
      const result = validateSASTokenRequest(longName);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe("blobName");
    });

    it("should validate expiry time parameters", () => {
      const result = validateSASTokenRequest("videos/test/file.ts", {
        expiresInSeconds: -1,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe("expiresInSeconds");
    });

    it("should reject expiry times exceeding 30 days", () => {
      const result = validateSASTokenRequest("videos/test/file.ts", {
        expiresInSeconds: 31 * 24 * 60 * 60,
      });

      expect(result.isValid).toBe(false);
    });
  });

  describe("mapAzureErrorToCloudError", () => {
    it("should map blob not found errors", () => {
      const error = new Error("The specified blob does not exist");
      error.code = "BlobNotFound";

      const mapped = mapAzureErrorToCloudError(error);

      expect(mapped.code).toBe(CloudErrorCodes.BLOB_NOT_FOUND);
      expect(mapped.statusCode).toBe(404);
    });

    it("should map permission denied errors", () => {
      const error = new Error(
        "Unauthorized: The server failed to authenticate"
      );
      error.code = "AuthorizationPermissionMismatch";

      const mapped = mapAzureErrorToCloudError(error);

      expect(mapped.code).toBe(CloudErrorCodes.BLOB_ACCESS_DENIED);
      expect(mapped.statusCode).toBe(403);
    });

    it("should map container not found errors", () => {
      const error = new Error("The specified container does not exist");
      error.code = "ContainerNotFound";

      const mapped = mapAzureErrorToCloudError(error);

      expect(mapped.code).toBe(CloudErrorCodes.CONTAINER_NOT_FOUND);
      expect(mapped.statusCode).toBe(404);
    });

    it("should provide clear user-facing messages", () => {
      const error = new Error("Technical Azure error message");
      const mapped = mapAzureErrorToCloudError(error);

      expect(mapped.message).toBeDefined();
      expect(mapped.message.length).toBeGreaterThan(0);
      expect(mapped.message).not.toContain("undefined");
    });
  });

  describe("Error response creation", () => {
    it("should create properly formatted error responses", () => {
      const error = new Error("Test error");
      const response = createCloudErrorResponse(error, "test_context");

      expect(response).toHaveProperty("success", false);
      expect(response).toHaveProperty("statusCode");
      expect(response).toHaveProperty("message");
      expect(response).toHaveProperty("errorCode");
      expect(response).toHaveProperty("context", "test_context");
      expect(response).toHaveProperty("timestamp");
    });
  });
});

describe("Integration Tests", () => {
  it("should support complete token lifecycle", () => {
    const blobName = "videos/integration-test/file.ts";

    // 1. Generate token
    const generated = sasTokenService.generateReadSASUrl(blobName, {
      expiresInSeconds: 3600,
    });

    expect(generated.sasUrl).toBeDefined();

    // 2. Validate token
    const validation = sasTokenService.validateSASTokenExpiry(generated.sasUrl);

    expect(validation.isExpired).toBe(false);
    expect(validation.shouldRefresh).toBe(false);

    // 3. Regenerate before expiry
    const refreshed = sasTokenService.generateReadSASUrl(blobName, {
      expiresInSeconds: 3600,
    });

    expect(refreshed.sasUrl).toBeDefined();
    expect(refreshed.sasUrl).not.toBe(generated.sasUrl); // Different signatures due to time difference
  });

  it("should maintain security boundaries across operations", () => {
    const video1Blob = "videos/video1/master.m3u8";
    const video2Blob = "videos/video2/master.m3u8";

    const token1 = sasTokenService.generateReadSASUrl(video1Blob);
    const token2 = sasTokenService.generateReadSASUrl(video2Blob);

    // Cannot use video1 token to access video2 (different blob in signature)
    // This is enforced by Azure - different blobs mean different signatures
    expect(token1.sasUrl).not.toEqual(token2.sasUrl);
  });
});
