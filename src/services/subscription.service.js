import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { notificationService } from "./notification.service.js";
import mongoose from "mongoose";

class SubscriptionService {
  async toggleSubscription(channelId, userId) {
    if (!channelId || !userId) {
      throw new ApiError(400, "Invalid channel or user ID");
    }

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      throw new ApiError(400, "Invalid channel ID format");
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user ID format");
    }

    if (channelId.toString() === userId.toString()) {
      throw new ApiError(400, "You cannot subscribe to your own channel");
    }

    const channel = await mongoose.model("User").findById(channelId);
    if (!channel) {
      throw new ApiError(404, "Channel not found");
    }

    // Use atomic operation: try to delete first
    const deletedSubscription = await Subscription.findOneAndDelete({
      subscriber: userId,
      channel: channelId,
    });

    if (deletedSubscription) {
      return { subscribed: false };
    }

    // Create new subscription
    try {
      await Subscription.create({
        subscriber: userId,
        channel: channelId,
      });
    } catch (err) {
      // Handle duplicate key error (rare edge case)
      if (err.code === 11000) {
        return { subscribed: true };
      }
      throw err;
    }

    // Notify Channel Owner
    try {
      await notificationService.createNotification({
        recipient: channelId,
        sender: userId,
        type: "SUBSCRIBE",
        referenceId: channelId,
      });
    } catch (notifErr) {
      console.error(`Failed to create subscription notification:`, notifErr.message);
    }

    return { subscribed: true };
  }

  async getUserChannelSubscribers(channelId) {
    if (!channelId) throw new ApiError(400, "Channel ID is required");

    // Validate channelId format
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      throw new ApiError(400, "Invalid channel ID format");
    }

    return await Subscription.aggregate([
      {
        $match: {
          channel: new mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "subscriber",
          foreignField: "_id",
          as: "subscriber",
          pipeline: [
            {
              $project: {
                username: 1,
                fullname: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          subscriber: { $first: "$subscriber" },
        },
      },
    ]);
  }

  async getSubscribedChannels(subscriberId) {
    if (!subscriberId) throw new ApiError(400, "Subscriber ID is required");

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
      throw new ApiError(400, "Invalid subscriber ID format");
    }

    return await Subscription.aggregate([
      {
        $match: {
          subscriber: new mongoose.Types.ObjectId(subscriberId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "channel",
          foreignField: "_id",
          as: "channel",
          pipeline: [
            {
              $project: {
                username: 1,
                fullname: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          channel: { $first: "$channel" },
        },
      },
    ]);
  }
}

export const subscriptionService = new SubscriptionService();
