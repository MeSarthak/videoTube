import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new ApiError(401, "Access token is missing");
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        throw new ApiError(401, "Access token has expired");
      } else if (jwtError.name === "JsonWebTokenError") {
        throw new ApiError(401, "Invalid access token");
      }
      throw new ApiError(401, "Token verification failed");
    }

    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, "User associated with token not found");
    }
    req.user = user;
    next();
  } catch (error) {
    // Re-throw ApiError as-is, wrap other errors
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, "Authentication failed");
  }
});

export const optionalVerifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      req.user = null;
      return next();
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      req.user = null;
      return next();
    }
    req.user = user;
    next();
  } catch (error) {
    // If token is invalid, just proceed as unauthenticated
    req.user = null;
    next();
  }
});
