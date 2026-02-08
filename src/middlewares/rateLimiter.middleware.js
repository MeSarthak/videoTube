/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and DoS attacks
 */

import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/**
 * General API rate limiter
 * Limit: 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === "/api/v1/health";
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Limit: 5 requests per 15 minutes per IP
 * Prevents brute force attacks on login/register
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 attempts per windowMs
  message:
    "Too many authentication attempts, please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false, // Count failed requests
});

/**
 * Moderate rate limiter for file uploads
 * Limit: 10 requests per hour per IP
 * Prevents storage abuse
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: "Too many file uploads, please try again after an hour.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Loose rate limiter for read operations
 * Limit: 500 requests per 15 minutes per IP
 * Allows normal browsing while preventing heavy scraping
 */
export const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 read requests per windowMs
  message: "Too many read requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Only apply to GET requests
    return req.method !== "GET";
  },
});

/**
 * Singleton rate limiter for per-user operations
 * Limit: 1000 requests per hour per user (or 500 per IP if unauthenticated)
 */
export const userLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req) => {
    // Higher limit for authenticated users, lower for unauthenticated
    return req.user ? 1000 : 500;
  },
  message: "Rate limit exceeded, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user?._id?.toString()) {
      return req.user._id.toString();
    }
    return ipKeyGenerator(req.ip, 56);
  },
});

/**
 * Views rate limiter to prevent view count inflation
 * Limit: 1 request per IP per video per minute
 * Keys on IP + videoId combination
 */
export const viewsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1, // 1 view per IP per video per minute
  message: "You can only increment view count once per minute per video",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const videoId = req.params.videoId ?? req.originalUrl;
    const ipKey = ipKeyGenerator(req.ip, 56);
    return `${ipKey}-${videoId}`;
  },
});

export default {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  readLimiter,
  userLimiter,
  viewsLimiter,
};
