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
import { upload } from "../middlewares/diskStorageMulter.middleware.js";
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
  registerUser
);

userRouter.route("/login").post(authLimiter, loginUser);
//secure route
userRouter.route("/logout").post(verifyJWT, logoutUser);
userRouter.route("/refresh-token").post(refreshAccessToken);
userRouter.route("/changePassword").post(verifyJWT, changePassword);
userRouter
  .route("/updateAccountDetails")
  .patch(verifyJWT, updateAccountDetails);
userRouter
  .route("/updateAvatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);
userRouter
  .route("/updateCoverImage")
  .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);
userRouter.route("/channel/:username").get(getUserChannelProfile);
userRouter.route("/watch-history").get(verifyJWT, getWatchHistory);
export { userRouter };
