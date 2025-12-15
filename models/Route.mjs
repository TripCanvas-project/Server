import mongoose from "mongoose";

const routeSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },

    name: {
      type: String,
      default: "Default Route",
    },

    version: {
      type: Number,
      default: 1,
    },

    type: {
      type: String,
      enum: ["original", "optimized", "alternative", "user-modified"],
      default: "original",
    },

    // ===== Day별 일정 (Gemini API 구조와 일치) =====
    dailyPlans: [
      {
        day: {
          type: Number,
          required: true, // 1, 2, 3...
        },
        date: {
          type: Date,
          required: true, // 실제 날짜
        },

        // 그날 방문할 장소들
        places: [
          {
            order: {
              type: Number,
              required: true, // 그날의 방문 순서 (1, 2, 3...)
            },
            placeId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Place",
            },
            placeName: {
              type: String,
              required: true,
            },
            placeCategory: String, // cafe, food, etc.
            coordinates: {
              lat: Number,
              lng: Number,
            },
            scheduledTime: String, // "10:00", "14:00"
            estimatedDuration: Number, // 체류 시간 (분)
            estimatedCost: Number, // 예상 비용
            description: String, // Gemini가 생성한 설명
            closestSubway: String, // 가까운 지하철역
            note: String, // 사용자 메모

            // 이전 장소에서 이동 정보
            travelInfo: {
              distance: Number, // km
              duration: Number, // 분
              mode: {
                type: String,
                enum: ["driving", "transit", "walking", "bicycling"],
                default: "transit",
              },
            },
          },
        ],

        // 그날의 숙소
        accommodation: {
          placeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Place",
          },
          placeName: String,
          coordinates: {
            lat: Number,
            lng: Number,
          },
          checkInTime: String, // "15:00"
          checkOutTime: String, // "11:00"
          estimatedCost: Number,
          description: String,
          closestSubway: String,
          note: String,
        },

        // 그날의 통계
        dayStats: {
          totalDistance: {
            type: Number,
            default: 0,
          },
          totalDuration: {
            type: Number,
            default: 0,
          },
          totalCost: {
            type: Number,
            default: 0,
          },
          placeCount: {
            type: Number,
            default: 0,
          },
        },
      },
    ],

    // ===== 전체 경로 통계 =====
    totalDistance: Number,
    totalDuration: Number,
    totalCost: Number,

    generatedBy: {
      type: String,
      enum: ["user", "gemini-ai", "optimization"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual: 전체 장소 수
routeSchema.virtual("totalPlaces").get(function () {
  return this.dailyPlans.reduce((sum, day) => sum + day.places.length, 0);
});

// Virtual: 전체 일수
routeSchema.virtual("totalDays").get(function () {
  return this.dailyPlans.length;
});

// 인덱스
routeSchema.index({ tripId: 1, isActive: 1 });
routeSchema.index({ generatedBy: 1 });

export default mongoose.model("Route", routeSchema, "route");
