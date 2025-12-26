import User from "../models/User.js";
import { updateTripTitle } from "../dao/trip.mjs";

export async function findByUserid(userid) {
    return User.findOne({ userid });
}

export async function findByEmail(email) {
    return User.findOne({ email });
}

export async function findByUseridWithPassword(userid) {
    return User.findOne({ userid }).select("+password");
}

export async function createUser({
    userid,
    password,
    nickname,
    email,
    profileImg = null,
}) {
    const user = new User({
        userid,
        password,
        nickname,
        email,
        profileImg,
    });

    return user.save();
}

export async function findById(userId) {
    return User.findById(userId).select("-password");
}

export const updatePassword = async (userId, hashedPassword) => {
    return await User.findByIdAndUpdate(
        userId,
        { password: hashedPassword },
        { new: true }
    );
};

export const updateProfile = async (
    userId,
    nickname,
    email,
    bio,
    profileImg
) => {
    const updateFields = {
        nickname,
        email,
        bio,
    };

    if (profileImg) {
        updateFields.profileImg = profileImg;
    }

    return await User.findByIdAndUpdate(userId, updateFields, { new: true });
};

// 비밀번호 포함해서 유저 조회 (비번 변경용)
export const findByIdWithPassword = async (userId) => {
    return await User.findById(userId).select("+password");
};

export const deleteUser = async (userId) => {
    return await User.findByIdAndDelete(userId);
};

export async function getTripStyles(userId) {
    const user = await User.findById(userId).select("userTripStyles");
    if (!user) return {};

    // Map이면 Object로 변환, 아니면 그대로 반환
    if (user.userTripStyles instanceof Map) {
        return Object.fromEntries(user.userTripStyles);
    }
    return user.userTripStyles || {};
}

export async function updateTripDesign(userId, tripId, style = {}, title) {
    let updatedStyle = null;

    // Trip title 변경 (구성원들과 공유)
    if (title !== undefined) {
        const trip = await updateTripTitle(tripId, userId, title);
        if (!trip) {
            throw new Error("여행 제목 수정 권한 없음");
        }
    }

    // User trip style 변경 (개인)
    const update = {};

    if (style.emoji !== undefined) {
        update[`userTripStyles.${tripId}.emoji`] = style.emoji;
    }

    if (style.color !== undefined) {
        update[`userTripStyles.${tripId}.color`] = style.color;
    }

    if (Object.keys(update).length > 0) {
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: update },
            {
                new: true,
                select: "userTripStyles",
            }
        );

        updatedStyle = user?.userTripStyles?.get(tripId) || null;
    }

    return {
        updatedStyle,
    };
}

// export const findByIdWithBucketlists = async (userId) => {
//     return await User.findById(userId)
//         .populate("bucketlists")
//         .select("nickname bucketlists");
// };
