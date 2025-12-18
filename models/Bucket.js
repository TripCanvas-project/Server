import mongoose from "mongoose";

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
      maxlength: [50, "챌린지 이름은 50자 이하여야 합니다"],
    },

    description: {
      type: String,
      maxlength: [500, "챌린지 설명은 500자 이하여야 합니다"],
    },

    // 아이콘 추가
    icon: {
      type: String,
      default: "🎯",
    },

    category: {
      type: String,
      enum: ["cafe", "food", "history", "nature", "culture", "camping"],
      required: true,
    },

    target: {
      type: Number,
      required: true,
      min: 1,
    },

    current: {
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

// Virtual: 진행률 (퍼센트)
BucketlistSchema.virtual("progress").get(function () {
  if (this.target === 0) return 0;
  return Math.round((this.current / this.target) * 100);
});

// Virtual: 진행률 텍스트
BucketlistSchema.virtual("progressText").get(function () {
  return `${this.current} / ${this.target}`;
});

// Virtual: 참여자 수
BucketlistSchema.virtual("participantCount").get(function () {
  return this.collaborators ? this.collaborators.length + 1 : 1; // +1은 본인
});

// 인덱스
BucketlistSchema.index({ userId: 1, status: 1 });
BucketlistSchema.index({ category: 1 });

export default mongoose.model("Bucketlist", BucketlistSchema);
