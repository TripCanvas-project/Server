import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        userid: {
            type: String,
            required: [true, "아이디를 입력해주세요"],
            unique: true,
            trim: true,
            minlength: 4,
            maxlength: 20,
            match: [/^[a-zA-Z0-9]+$/, "아이디는 영문과 숫자만 사용 가능합니다"],
        },

        password: {
            type: String,
            required: [true, "비밀번호를 입력해주세요"],
            minlength: 8,
            select: false, // 기본 조회 시 제외
        },

        nickname: {
            type: String,
            required: [true, "닉네임을 입력해주세요"],
            trim: true,
            minlength: 2,
            maxlength: 10,
        },

        email: {
            type: String,
            required: [true, "이메일을 입력해주세요"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "올바른 이메일 형식이 아닙니다"],
        },

        profileImg: {
            type: String,
            default: null,
        },

        bio: {
            type: String,
            maxlength: 200,
            default: "",
        },

        preferences: {
            categories: [
                {
                    type: String,
                    enum: [
                        "cafe",
                        "food",
                        "history",
                        "nature",
                        "culture",
                        "camping",
                    ],
                },
            ],
        },

        userTripStyles: {
            // trip template 디자인
            type: Map,
            of: {
                emoji: String, // 이모지
                color: String, // 배경 색상
            },
            default: {},
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

userSchema.virtual("trips", {
    ref: "Trip", // 연결할 모델
    localField: "_id", // User의 어떤 필드를
    foreignField: "owner", // Trip의 어떤 필드와 매칭할지(Trip 모델에서 사용자를 가리키는 필드명이 owner임)
});

userSchema.virtual("bucketlists", {
    ref: "Bucketlist",
    localField: "_id",
    foreignField: "userId",
});

userSchema.virtual("stats").get(function() {
    const trips = this.trips || [];
    const bucketlists = this.bucketlists || [];
    
    // Trip status별 카운트
    const totalTrips = trips.length || 0;
    const planningTrips = trips.filter(t => t.status === 'planning').length || 0;
    const completedTrips = trips.filter(t => t.status === 'completed').length || 0;
    
    // Bucketlist 카운트
    const totalBucketlists = bucketlists.length || 0;
    const completedBucketlists = bucketlists.filter(b => b.isCompleted).length || 0;
    
    return {
        totalTrips,
        planningTrips,
        completedTrips,
        totalBucketlists,
        completedBucketlists
    };
});

export default mongoose.model("User", userSchema);
