import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
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

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "지출 이름은 100자 이하여야 합니다"],
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      enum: ["식비", "교통비", "숙박비", "액티비티", "쇼핑", "입장권", "기타"],
      required: true,
    },

    // Gemini AI 자동 태깅을 위한 필드
    autoTags: [String], // AI가 자동으로 부여한 태그

    date: {
      type: Date,
      default: Date.now,
    },

    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
    },

    // 공동 비용 분담
    payers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        amount: Number,
      },
    ],

    sharers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        shareAmount: Number, // 각 사람이 부담할 금액
      },
    ],

    memo: String,
    receipt: String,
    tags: [String],

    // 정산 상태
    isSettled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// budgetSchema.index({ userId: 1, tripId: 1, date: -1 });
export default mongoose.model("Budget", budgetSchema, "budget");
