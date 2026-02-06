import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

class NotificationService {
  /**
   * Create a new notification.
   * Checks to ensure we don't notify a user about their own action.
   * Uses atomic upsert to prevent race conditions.
   */
  async createNotification({ recipient, sender, type, referenceId }) {
    // Guard against null/undefined recipient or sender
    if (!recipient || !sender) {
      return null;
    }

    // Don't notify if sender is same as recipient
    if (recipient.toString() === sender.toString()) {
      return null;
    }

    // Atomic upsert: find or create, avoiding the race condition between
    // check (findOne) and create steps. Updates existing unread notification's timestamp.
    const notification = await Notification.findOneAndUpdate(
      {
        recipient,
        sender,
        type,
        referenceId,
        isRead: false,
      },
      {
        recipient,
        sender,
        type,
        referenceId,
        isRead: false,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return notification;
  }

  /**
   * Get paginated notifications for the current user
   */
  async getUserNotifications(userId, page = 1, limit = 10) {
    // Validate userId before ObjectId conversion
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user ID format");
    }

    const aggregateQuery = Notification.aggregate([
      {
        $match: {
          recipient: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $sort: { updatedAt: -1 },
      },
      // Lookup Sender details
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "sender",
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
          sender: { $first: "$sender" },
        },
      },
    ]);

    return await Notification.aggregatePaginate(aggregateQuery, {
      page,
      limit,
    });
  }

  /**
   * Get count of unread notifications
   */
  async getUnreadCount(userId) {
    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });
    return { unreadCount: count };
  }

  /**
   * Mark a specific notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient: userId, // Security check: Ensure it belongs to user
      },
      {
        $set: { isRead: true },
      },
      { new: true }
    );

    if (!notification) {
      throw new ApiError(404, "Notification not found");
    }

    return notification;
  }

  /**
   * Mark ALL notifications as read for a user
   */
  async markAllAsRead(userId) {
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );
    return { message: "All notifications marked as read" };
  }
}

export const notificationService = new NotificationService();
