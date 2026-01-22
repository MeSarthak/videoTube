import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { subscriptionService } from "../services/subscription.service.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const result = await subscriptionService.toggleSubscription(
    channelId,
    req.user?._id
  );

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Subscription toggled successfully"));
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscribers =
    await subscriptionService.getUserChannelSubscribers(channelId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "Subscribers fetched successfully")
    );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const channels =
    await subscriptionService.getSubscribedChannels(subscriberId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, channels, "Subscribed channels fetched successfully")
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
