import mongoose from "mongoose";

const BucketItemSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    done: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const BucketlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, "챌린지 이름은 50자 이하이어야 합니다."],
    },

    title: {
      type: String,
      trim: true,
      maxlength: [100, "제목은 100자 이하이어야 합니다."],
    },

    description: {
      type: String,
      maxlength: [500, "챌린지 설명은 500자 이하이어야 합니다."],
    },

    // 아이콘/테마
    icon: {
      type: String,
      default: "🎯",
    },

    theme: {
      type: String,
      default: "",
    },

    items: {
      type: [BucketItemSchema],
      default: [],
    },

    category: {
      type: String,
      enum: ["general", "cafe", "food", "history", "nature", "culture", "camping"],
      default: "general",
    },

    target: {
      type: Number,
      default: 0,
      min: 0,
    },

    targetCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    current: {
      type: Number,
      default: 0,
      min: 0,
    },

    completedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    completedPlaces: [
      {
        placeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Place",
        },
        placeName: String,
        completedAt: Date,
        tripId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Trip",
        },
      },
    ],

    status: {
      type: String,
      enum: ["active", "completed", "paused"],
      default: "active",
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    collaborators: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        nickname: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: 진행률(퍼센트)
BucketlistSchema.virtual("progress").get(function () {
  const targetTotal = this.targetCount || this.target || 0;
  if (targetTotal === 0) return 0;
  const completedTotal = this.completedCount || this.current || 0;
  return Math.round((completedTotal / targetTotal) * 100);
});

// Virtual: 진행률 텍스트
BucketlistSchema.virtual("progressText").get(function () {
  const targetTotal = this.targetCount || this.target || 0;
  const completedTotal = this.completedCount || this.current || 0;
  return `${completedTotal} / ${targetTotal}`;
});

// Virtual: 참여자 수
BucketlistSchema.virtual("participantCount").get(function () {
  return this.collaborators ? this.collaborators.length + 1 : 1; // +1은 본인
});

// 인덱스
BucketlistSchema.index({ userId: 1, status: 1 });
BucketlistSchema.index({ category: 1 });

export default mongoose.model("Bucketlist", BucketlistSchema);
