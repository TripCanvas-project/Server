import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userid: {
        type: String,
        required: [true, "아이디를 입력해주세요"],
        unique: true,
        trim: true,
        minlength: [4, "아이디는 4자 이상이어야 합니다"],
        maxlength: [20, "아이디는 20자 이하여야 합니다"],
        match: [/^[a-zA-Z0-9]+$/, "아이디는 영문과 숫자만 사용 가능합니다"],
    },
    password: {
        type: String,
        required: [true, "비밀번호를 입력해주세요"],
        minlength: [8, "비밀번호는 8자 이상이어야 합니다"],
        select: false, // 기본 쿼리에서 제외
    },
    nickname: {
        type: String,
        required: [true, "닉네임을 입력해주세요"],
        trim: true,
        minlength: [2, "닉네임은 2자 이상이어야 합니다"],
        maxlength: [10, "닉네임은 10자 이하여야 합니다"],
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
    // 자기소개
    bio: {
        type: String,
        maxlength: [200, "자기소개는 200자 이하여야 합니다"],
        default: "",
    },
    // 버킷리스트 / 선호 카테고리
    preferences: {
        categories: [
            {
                type: String,
                enum: ['cafe', 'food', 'history', 'nature', 'culture', 'camping']
            },
        ],
    },

    // 여행 통계
    stats: {
        totalTrips: { type: Number, default: 0 },
        completedTrips: {type: Number, default: 0},
        totalPlaces: {type: Number, default: 0},
        totalBucketlists: {type: Number, default: 0},
        completedBucketlists: {type: Number, default: 0}
    }
});

// [
//   { _id: "xyz789", title: "부산 여행", owner: "abc123", ... },
//   { _id: "def456", title: "제주 여행", owner: "abc123", ... }
// ]
userSchema.virtual('trips', {
    ref: 'Trip',            // 연결할 모델
    localField: '_id',      // User의 어떤 필드를
    foreignField: 'owner'  // Trip의 어떤 필드와 매칭할지(Trip 모델에서 사용자를 가리키는 필드명이 owner임)
});

userSchema.virtual('bucketlists', {
    ref: 'Bucketlist',
    localField: '_id',
    foreignField: 'userId'
});

export default mongoose.model('User', userSchema);  // ⚠️ 이 줄 추가 필요!