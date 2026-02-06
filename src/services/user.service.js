import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { validateObjectId } from "../utils/validators.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

class UserService {
  async generateAccessAndRefreshToken(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError(404, "User not found");
      }
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();
      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
      return { accessToken, refreshToken };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "Token generation failed");
    }
  }

  async registerUser({
    username,
    fullname,
    email,
    password,
    avatarLocalPath,
    coverImageLocalPath,
  }) {
    // Validate fields - explicitly check for null/undefined
    if (
      !fullname || !username || !email || !password ||
      String(fullname).trim() === "" ||
      String(username).trim() === "" ||
      String(email).trim() === "" ||
      String(password).trim() === ""
    ) {
      throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existedUser) {
      throw new ApiError(
        409,
        "User already exists with this email or username"
      );
    }

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    let coverImage = null;

    if (coverImageLocalPath) {
      coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    if (!avatar) {
      throw new ApiError(500, "Avatar upload failed");
    }

    const user = await User.create({
      fullname,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
    if (!createdUser) {
      throw new ApiError(500, "User creation failed");
    }

    return createdUser;
  }

  async loginUser({ email, username, password }) {
    if (!username && !email) {
      throw new ApiError(400, "Email or Username is required");
    }

    // Build $or query dynamically to avoid undefined values
    const orCriteria = [];
    if (username != null && username !== "") {
      orCriteria.push({ username });
    }
    if (email != null && email !== "") {
      orCriteria.push({ email });
    }

    if (orCriteria.length === 0) {
      throw new ApiError(400, "Email or Username is required");
    }

    const query = orCriteria.length === 1 ? orCriteria[0] : { $or: orCriteria };
    const user = await User.findOne(query);

    // Generic authentication error to prevent username enumeration
    if (!user) {
      throw new ApiError(401, "Invalid credentials");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } =
      await this.generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    return { user: loggedInUser, accessToken, refreshToken };
  }

  async logoutUser(userId) {
    await User.findByIdAndUpdate(
      userId,
      { $set: { refreshToken: undefined } },
      { new: true }
    );
  }

  async refreshAccessToken(incomingRefreshToken) {
    if (!incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is missing");
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
    } catch (error) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(401, "User not found");
    }

    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    return this.generateAccessAndRefreshToken(user._id);
  }

  async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
      throw new ApiError(400, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: true });
  }

  async updateAccountDetails(userId, { fullname, email }) {
    if (!fullname || !email) {
      throw new ApiError(400, "All fields are required");
    }

    // Check for existing email (avoid duplicate email for different user)
    const existingUser = await User.findOne({ email });
    if (existingUser && !existingUser._id.equals(userId)) {
      throw new ApiError(409, "Email already in use");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          fullname,
          email,
        },
      },
      { new: true }
    ).select("-password");

    return user;
  }

  async updateAvatar(userId, avatarLocalPath) {
    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
      throw new ApiError(500, "Avatar upload failed");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { avatar: avatar.url } },
      { new: true }
    ).select("-password");

    return user;
  }

  async updateCoverImage(userId, coverImageLocalPath) {
    if (!coverImageLocalPath) {
      throw new ApiError(400, "Cover image is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage) {
      throw new ApiError(500, "Cover image upload failed");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { coverImage: coverImage.url } },
      { new: true }
    ).select("-password");

    return user;
  }

  async getUserChannelProfile(username, currentUserId) {
    if (!username?.trim()) {
      throw new ApiError(400, "Username is required");
    }

    const channel = await User.aggregate([
      {
        $match: {
          username: username.trim().toLowerCase(),
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subscribersCount: { $size: "$subscribers" },
          subscribedToCount: { $size: "$subscribedTo" },
          isSubscribed: {
            $cond: {
              if: {
                $in: [
                  currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)
                    ? new mongoose.Types.ObjectId(currentUserId)
                    : null,
                  "$subscribers.subscriber",
                ],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          fullname: 1,
          username: 1,
          subscribersCount: 1,
          subscribedToCount: 1,
          isSubscribed: 1,
          avatar: 1,
          coverImage: 1,
          email: 1,
        },
      },
    ]);

    if (!channel?.length) {
      throw new ApiError(404, "Channel not found");
    }

    return channel[0];
  }

  async getWatchHistory(userId) {
    // Validate userId before creating ObjectId
    validateObjectId(userId, "User ID");

    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullname: 1,
                      username: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                owner: {
                  $first: "$owner",
                },
              },
            },
          ],
        },
      },
    ]);

    if (!user || !user[0]) {
      throw new ApiError(404, "User not found");
    }

    return user[0].watchHistory;
  }
}

export const userService = new UserService();
