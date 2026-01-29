import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../controllers/notification.controller.js";

const router = Router();

router.use(verifyJWT); // All routes require authentication

router.route("/").get(getUserNotifications);
router.route("/unread-count").get(getUnreadCount);
router.route("/:notificationId/read").patch(markAsRead);
router.route("/mark-all-read").patch(markAllAsRead);

export { router as notificationRouter };
