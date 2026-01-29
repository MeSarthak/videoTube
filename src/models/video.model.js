import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    title: { type: String, required: true, index: true },
    description: { type: String, required: true },
    tags: [{ type: String }],
    duration: { type: Number }, // Not required initially
    segmentsBasePath: { type: String }, // Not required initially
    masterPlaylist: { type: String }, // Not required initially
    variants: [{ type: String }],
    thumbnail: { type: String },

    views: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },

    // Status tracking
    status: {
      type: String,
      enum: ["pending", "processing", "published", "failed"],
      default: "pending",
    },
    uploadStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    errorMessage: { type: String },

    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
