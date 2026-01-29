import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { notificationService } from "./notification.service.js";
import mongoose from "mongoose";

class SubscriptionService {
  async toggleSubscription(channelId, userId) {
    if (!channelId || !userId) {
      throw new ApiError(400, "Invalid channel or user ID");
    }

    if (channelId.toString() === userId.toString()) {
      throw new ApiError(400, "You cannot subscribe to your own channel");
    }

    const channel = await mongoose.model("User").findById(channelId);
    if (!channel) {
      throw new ApiError(404, "Channel not found");
    }

    const existingSubscription = await Subscription.findOne({
      subscriber: userId,
      channel: channelId,
    });

    if (existingSubscription) {
      await Subscription.findByIdAndDelete(existingSubscription._id);
      return { subscribed: false };
    }

    await Subscription.create({
      subscriber: userId,
      channel: channelId,
    });

    // Notify Channel Owner
    await notificationService.createNotification({
      recipient: channelId,
      sender: userId,
      type: "SUBSCRIBE",
      referenceId: channelId, // Channel ID serves as reference
    });

    return { subscribed: true };
  }

  async getUserChannelSubscribers(channelId) {
    if (!channelId) throw new ApiError(400, "Channel ID is required");

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
