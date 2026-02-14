import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

// Subtitle schema for embedded document
const subtitleSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "disabled"],
      default: "pending",
    },
    language: { type: String, default: "auto" }, // User-requested language
    detectedLanguage: { type: String }, // Auto-detected by Whisper
    task: {
      type: String,
      enum: ["transcribe", "translate"],
      default: "transcribe",
    },
    files: {
      srt: { type: String }, // Azure blob URL
      vtt: { type: String }, // Azure blob URL
      json: { type: String }, // Azure blob URL
      txt: { type: String }, // Azure blob URL
    },
    segmentCount: { type: Number },
    errorMessage: { type: String },
    processedAt: { type: Date },
  },
  { _id: false }
);

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
    isPublished: { type: Boolean, default: false },

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

    // Subtitles/Transcription
    subtitles: {
      type: subtitleSchema,
      default: () => ({
        status: "pending",
        language: "auto",
        task: "transcribe",
      }),
    },

    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
