/**
 * Input Validators
 * Provides reusable validation functions for common input types
 */

import mongoose from "mongoose";
import { ApiError } from "./ApiError.js";

/**
 * Validate and convert string to ObjectId
 * @param {string} id - The ID string to validate
 * @param {string} fieldName - Name of field for error message
 * @returns {ObjectId} Valid mongoose ObjectId
 * @throws {ApiError} If ID is invalid
 */
export const validateObjectId = (id, fieldName = "ID") => {
  if (!id) {
    throw new ApiError(400, `${fieldName} is required`);
  }

  if (typeof id !== "string") {
    throw new ApiError(400, `${fieldName} must be a string`);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${fieldName} format`);
  }

  try {
    return new mongoose.Types.ObjectId(id);
  } catch (error) {
    throw new ApiError(400, `Invalid ${fieldName} format`);
  }
};

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {number} maxLimit - Maximum allowed limit
 * @returns {object} { page, limit }
 * @throws {ApiError} If parameters are invalid
 */
export const validatePagination = (page = 1, limit = 10, maxLimit = 100) => {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);

  if (isNaN(parsedPage) || parsedPage < 1) {
    throw new ApiError(400, "Page must be a positive integer");
  }

  if (isNaN(parsedLimit) || parsedLimit < 1) {
    throw new ApiError(400, "Limit must be a positive integer");
  }

  if (parsedLimit > maxLimit) {
    throw new ApiError(400, `Limit cannot exceed ${maxLimit}`);
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
};

/**
 * Validate string field
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name of field for error message
 * @param {object} options - Validation options
 * @returns {string} Trimmed value
 * @throws {ApiError} If validation fails
 */
export const validateString = (value, fieldName = "Field", options = {}) => {
  const {
    required = true,
    minLength = 0,
    maxLength = 1000,
    trim = true,
  } = options;

  if (!value) {
    if (required) {
      throw new ApiError(400, `${fieldName} is required`);
    }
    return null;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldName} must be a string`);
  }

  const trimmedValue = trim ? value.trim() : value;

  if (trimmedValue.length < minLength) {
    throw new ApiError(
      400,
      `${fieldName} must be at least ${minLength} characters`
    );
  }

  if (trimmedValue.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} cannot exceed ${maxLength} characters`
    );
  }

  return trimmedValue;
};

/**
 * Validate array field
 * @param {array} value - Value to validate
 * @param {string} fieldName - Name of field for error message
 * @param {object} options - Validation options
 * @returns {array} Validated array
 * @throws {ApiError} If validation fails
 */
export const validateArray = (value, fieldName = "Array", options = {}) => {
  const { required = true, minLength = 0, maxLength = 1000 } = options;

  if (!value) {
    if (required) {
      throw new ApiError(400, `${fieldName} is required`);
    }
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ApiError(400, `${fieldName} must be an array`);
  }

  if (value.length < minLength) {
    throw new ApiError(
      400,
      `${fieldName} must contain at least ${minLength} items`
    );
  }

  if (value.length > maxLength) {
    throw new ApiError(400, `${fieldName} cannot exceed ${maxLength} items`);
  }

  return value;
};

/**
 * Validate number field
 * @param {number} value - Value to validate
 * @param {string} fieldName - Name of field for error message
 * @param {object} options - Validation options
 * @returns {number} Validated number
 * @throws {ApiError} If validation fails
 */
export const validateNumber = (value, fieldName = "Number", options = {}) => {
  const { required = true, min = null, max = null } = options;

  if (value === null || value === undefined) {
    if (required) {
      throw new ApiError(400, `${fieldName} is required`);
    }
    return null;
  }

  const num = Number(value);

  // Reject empty strings explicitly before Number coercion
  if (typeof value === "string" && value.trim() === "") {
    throw new ApiError(400, `${fieldName} must be a valid number`);
  }

  if (isNaN(num)) {
    throw new ApiError(400, `${fieldName} must be a valid number`);
  }

  if (min !== null && num < min) {
    throw new ApiError(400, `${fieldName} must be at least ${min}`);
  }

  if (max !== null && num > max) {
    throw new ApiError(400, `${fieldName} cannot exceed ${max}`);
  }

  return num;
};

/**
 * Validate boolean field
 * @param {boolean} value - Value to validate
 * @param {string} fieldName - Name of field for error message
 * @param {object} options - Validation options
 * @returns {boolean} Validated boolean
 * @throws {ApiError} If validation fails
 */
export const validateBoolean = (value, fieldName = "Boolean", options = {}) => {
  const { required = true } = options;

  if (value === null || value === undefined) {
    if (required) {
      throw new ApiError(400, `${fieldName} is required`);
    }
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const lowerValue = value.toLowerCase();
    if (lowerValue === "true") return true;
    if (lowerValue === "false") return false;
  }

  throw new ApiError(400, `${fieldName} must be a boolean`);
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @param {string} fieldName - Name of field for error message
 * @returns {string} Validated email
 * @throws {ApiError} If validation fails
 */
export const validateEmail = (email, fieldName = "Email") => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    throw new ApiError(400, `${fieldName} is required`);
  }

  // Trim first, then validate
  const normalized = email.trim();

  if (!emailRegex.test(normalized)) {
    throw new ApiError(400, `${fieldName} format is invalid`);
  }

  return normalized.toLowerCase();
};

/**
 * Validate enum value
 * @param {string|number} value - Value to validate
 * @param {array} allowedValues - Allowed enum values
 * @param {string} fieldName - Name of field for error message
 * @returns {string|number} Validated value
 * @throws {ApiError} If validation fails
 */
export const validateEnum = (
  value,
  allowedValues = [],
  fieldName = "Field"
) => {
  // Only check for null/undefined, not falsy values (0, false, "" might be valid)
  if (value === undefined || value === null) {
    throw new ApiError(400, `${fieldName} is required`);
  }

  if (!allowedValues.includes(value)) {
    throw new ApiError(
      400,
      `${fieldName} must be one of: ${allowedValues.join(", ")}`
    );
  }

  return value;
};

export default {
  validateObjectId,
  validatePagination,
  validateString,
  validateArray,
  validateNumber,
  validateBoolean,
  validateEmail,
  validateEnum,
};
