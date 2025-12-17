import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    time: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "일정 제목은 100자 이하여야 합니다"],
    },

    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "위치는 200자 이하여야 합니다"],
    },

    date: {
      type: Date,
      default: Date.now,
    },

    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
    },

    memo: String,
    tags: [String],

    // 완료 여부
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Schedule", scheduleSchema, "schedule");
