/**
 * Cloud Operations Error Handler
 * Provides clear error codes and messages for SAS token and Azure operations
 */

import { ApiError } from "./ApiError.js";

export const CloudErrorCodes = {
  // SAS Token Errors
  SAS_INVALID_FORMAT: "SAS_INVALID_FORMAT",
  SAS_EXPIRED: "SAS_EXPIRED",
  SAS_NEEDS_REFRESH: "SAS_NEEDS_REFRESH",
  SAS_PERMISSION_DENIED: "SAS_PERMISSION_DENIED",

  // Blob Storage Errors
  BLOB_NOT_FOUND: "BLOB_NOT_FOUND",
  BLOB_ACCESS_DENIED: "BLOB_ACCESS_DENIED",
  CONTAINER_NOT_FOUND: "CONTAINER_NOT_FOUND",

  // Authentication Errors
  AUTH_FAILED: "AUTH_FAILED",
  CREDENTIALS_INVALID: "CREDENTIALS_INVALID",

  // Generation Errors
  SAS_GENERATION_FAILED: "SAS_GENERATION_FAILED",
  INVALID_BLOB_NAME: "INVALID_BLOB_NAME",

  // Configuration Errors
  CONFIG_MISSING: "CONFIG_MISSING",
};

/**
 * Map Azure Storage errors to user-friendly error codes and messages
 */
export const mapAzureErrorToCloudError = (error) => {
  if (!error) {
    return {
      code: "UNKNOWN_ERROR",
      message: "An unknown error occurred",
      statusCode: 500,
    };
  }

  const errorMessage = error.message?.toLowerCase() || "";
  const errorCode = error.code?.toLowerCase() || "";

  // Blob not found
  if ((errorCode.includes("notfound") || errorMessage.includes("not found")) && !errorCode.includes("container")) {
    return {
      code: CloudErrorCodes.BLOB_NOT_FOUND,
      message: "The requested blob was not found. It may have been deleted.",
      statusCode: 404,
      details: error.message,
    };
  }

  // Access denied / unauthorized
  if (
    errorCode.includes("autho") ||
    errorCode.includes("permiss") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("permission denied")
  ) {
    return {
      code: CloudErrorCodes.BLOB_ACCESS_DENIED,
      message:
        "Access to the blob storage was denied. Check credentials and permissions.",
      statusCode: 403,
      details: error.message,
    };
  }

  // Container not found
  if (
    errorCode.includes("containernotfound") || errorCode.includes("containername") ||
    errorMessage.includes("container not found")
  ) {
    return {
      code: CloudErrorCodes.CONTAINER_NOT_FOUND,
      message: "The storage container was not found.",
      statusCode: 404,
      details: error.message,
    };
  }

  // Invalid credentials
  if (
    errorMessage.includes("credentials") ||
    errorMessage.includes("authentication failed")
  ) {
    return {
      code: CloudErrorCodes.CREDENTIALS_INVALID,
      message: "Storage credentials are invalid or expired.",
      statusCode: 500,
      details: error.message,
    };
  }

  // Network or timeout errors
  if (errorCode.includes("timeout") || errorCode.includes("network")) {
    return {
      code: "CLOUD_SERVICE_UNAVAILABLE",
      message:
        "Cloud storage service is temporarily unavailable. Please try again.",
      statusCode: 503,
      details: error.message,
    };
  }

  // Default cloud error
  return {
    code: "CLOUD_OPERATION_FAILED",
    message: "A cloud storage operation failed. Please try again.",
    statusCode: 500,
    details: error.message,
  };
};

/**
 * Validates SAS token parameters before generation
 */
export const validateSASTokenRequest = (blobName, options = {}) => {
  const errors = [];

  // Validate blob name
  if (!blobName || typeof blobName !== "string") {
    errors.push({
      field: "blobName",
      message: "Blob name is required and must be a string",
      code: CloudErrorCodes.INVALID_BLOB_NAME,
    });
  } else if (blobName.length > 1024) {
    errors.push({
      field: "blobName",
      message: "Blob name is too long (max 1024 characters)",
      code: CloudErrorCodes.INVALID_BLOB_NAME,
    });
  }
  // Validate expiry time
  if (options.expiresInSeconds !== undefined) {
    if (
      !Number.isInteger(options.expiresInSeconds) ||
      options.expiresInSeconds <= 0
    ) {
      errors.push({
        field: "expiresInSeconds",
        message: "Expiry time must be a positive integer",
      });
    } else if (options.expiresInSeconds > 30 * 24 * 60 * 60) {
      errors.push({
        field: "expiresInSeconds",
        message: "Expiry time cannot exceed 30 days for security",
      });
    }
  }

  // Validate permissions
  if (options.permissions) {
    const allowedPerms = ["r", "c", "w", "d"];
    const perms = options.permissions.split("");
    const invalidPerms = perms.filter((p) => !allowedPerms.includes(p));
    if (invalidPerms.length > 0) {
      errors.push({
        field: "permissions",
        message: `Invalid permissions: ${invalidPerms.join(", ")}. Allowed: r, c, w, d`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Create a cloud-aware error response
 */
export const createCloudErrorResponse = (error, context = "") => {
  const mappedError = mapAzureErrorToCloudError(error);

  const response = {
    success: false,
    statusCode: mappedError.statusCode,
    message: mappedError.message,
    errorCode: mappedError.code,
    context,
    timestamp: new Date().toISOString(),
  };

  // Include details only in development
  if (process.env.NODE_ENV === "development") {
    response.details = mappedError.details;
    response.originalError = error.message;
  }

  return response;
};

/**
 * Check if error is retriable (transient)
 */
export const isRetriableCloudError = (error) => {
  if (!error) return false;

  const errorCode = error.code?.toLowerCase() || "";
  const errorMessage = error.message?.toLowerCase() || "";

  // Timeout, throttling, service unavailable
  const retriableCodes = [
    "timeout",
    "econnrefused",
    "econnreset",
    "429",
    "503",
    "500",
  ];

  return retriableCodes.some(
    (code) =>
      errorCode.includes(code) ||
      errorMessage.includes(code) ||
      error.statusCode === 429 ||
      error.statusCode === 503
  );
};

/**
 * Async wrapper with automatic retry for cloud operations
 */
export const withCloudRetry = async (
  operation,
  maxRetries = 3,
  baseDelayMs = 1000
) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetriableCloudError(error) || attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff
      const delayMs = baseDelayMs * Math.pow(2, attempt);
      console.warn(
        `Cloud operation failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delayMs}ms:`,
        error.message
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
};
