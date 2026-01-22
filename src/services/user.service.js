import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

class UserService {
  async generateAccessAndRefreshToken(userId) {
    try {
      const user = await User.findById(userId);
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();
      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
      return { accessToken, refreshToken };
    } catch (err) {
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
    if (
      [fullname, username, email, password].some(
        (field) => field?.trim() === ""
      )
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
      throw new ApiError(400, "Avatar upload failed");
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

    const user = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid password");
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

    // In a real service, you might want to decode the token here or assume the caller has done it.
    // However, for strict layering, services usually handle data logic.
    // We'll rely on the controller to pass the token, but we verify it here if needed,
    // or assume the middleware/controller logic is sound.
    // For this implementation, let's keep the verification logic here to be safe or rely on the caller.

    // Note: jwt.verify needs the secret, which is env var.
    // To keep it simple and clean, we'll import jwt in the service if we need to verify again,
    // or we assume the controller passes the decoded ID.
    // BUT, the original logic verifies the token string.

    // We will verify it here to encapsulate the logic.
    const jwt = (await import("jsonwebtoken")).default;
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
    if (!avatar.url) {
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
    if (!coverImage.url) {
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
              if: { $in: [currentUserId, "$subscribers.subscriber"] },
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

    return user[0].watchHistory;
  }
}

export const userService = new UserService();
