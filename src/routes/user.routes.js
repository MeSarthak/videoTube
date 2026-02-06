import { Router } from "express";
import {
  registerUser,
  changePassword,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";
import { upload, validateFileSignature } from "../middlewares/diskStorageMulter.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimiter.middleware.js";
const userRouter = Router();

// Apply stricter rate limiting to auth endpoints
userRouter.route("/register").post(
  authLimiter,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  validateFileSignature, // Validate actual file signatures after upload
  registerUser
);

userRouter.route("/login").post(authLimiter, loginUser);
//secure route
userRouter.route("/logout").post(verifyJWT, logoutUser);
userRouter.route("/refresh-token").post(authLimiter, refreshAccessToken);
userRouter.route("/changePassword").post(verifyJWT, changePassword);
userRouter
  .route("/updateAccountDetails")
  .patch(verifyJWT, updateAccountDetails);
userRouter
  .route("/updateAvatar")
  .patch(verifyJWT, upload.single("avatar"), validateFileSignature, updateAvatar);
userRouter
  .route("/updateCoverImage")
  .patch(verifyJWT, upload.single("coverImage"), validateFileSignature, updateCoverImage);
userRouter.route("/channel/:username").get(getUserChannelProfile);
userRouter.route("/watch-history").get(verifyJWT, getWatchHistory);
export { userRouter };
