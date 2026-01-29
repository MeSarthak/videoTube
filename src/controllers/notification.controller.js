import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { notificationService } from "../services/notification.service.js";

const getUserNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const notifications = await notificationService.getUserNotifications(
    req.user._id,
    page,
    limit
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, notifications, "Notifications fetched successfully")
    );
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, count, "Unread count fetched successfully"));
});

const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const notification = await notificationService.markAsRead(
    notificationId,
    req.user._id
  );

  return res
    .status(200)
    .json(new ApiResponse(200, notification, "Notification marked as read"));
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "All notifications marked as read"));
});

export { getUserNotifications, getUnreadCount, markAsRead, markAllAsRead };
