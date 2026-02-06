import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "VIDEO_LIKE",
        "COMMENT_LIKE",
        "TWEET_LIKE",
        "COMMENT",
        "SUBSCRIBE",
      ],
      required: true,
    },
    // The ID of the thing that happened (VideoID, CommentID, TweetID, ChannelID)
    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.plugin(mongooseAggregatePaginate);

// Compound index for atomic upsert operations in createNotification
// Allows efficient find+update in single operation for duplicate prevention
notificationSchema.index(
  {
    recipient: 1,
    sender: 1,
    type: 1,
    referenceId: 1,
    isRead: 1,
  },
  { name: "unique_unread_notification" }
);

export const Notification = mongoose.model("Notification", notificationSchema);
