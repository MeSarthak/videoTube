import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    masterPlaylist: { type: String, required: true }, // master.m3u8
    variants: [
      {
        resolution: { type: String, required: true }, // e.g. "720p"
        playlist: { type: String, required: true }, // variant index.m3u8 URL
      },
    ],
    thumbnail: { type: String, required: true },
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true, trim: true },
    duration: { type: Number, required: true },
    segmentsBasePath: { type: String, required: true }, // upload folder root
    views: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    processingStatus: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "ready",
    },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
