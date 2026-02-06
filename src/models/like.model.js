import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Validate that exactly one of video, comment, or tweet is set
likeSchema.pre("validate", function (next) {
  const targets = [this.video, this.comment, this.tweet];
  const nonNullCount = targets.filter(t => t != null).length;

  if (nonNullCount !== 1) {
    next(
      new Error(
        "Exactly one of video, comment, or tweet must be provided for a like"
      )
    );
  } else {
    next();
  }
});

// Compound unique indexes with partial filters to prevent duplicate likes
// Only enforce uniqueness for documents where the target field exists
likeSchema.index(
  { video: 1, likedBy: 1 },
  { unique: true, partialFilterExpression: { video: { $exists: true } } }
);
likeSchema.index(
  { comment: 1, likedBy: 1 },
  { unique: true, partialFilterExpression: { comment: { $exists: true } } }
);
likeSchema.index(
  { tweet: 1, likedBy: 1 },
  { unique: true, partialFilterExpression: { tweet: { $exists: true } } }
);

export const Like = mongoose.model("Like", likeSchema);
