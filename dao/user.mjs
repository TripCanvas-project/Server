import User from "../models/User.js";
import { updateTripTitle } from "./trip.mjs";
import mongoose from "mongoose";

export async function findByUserid(userid) {
    return User.findOne({ userid });
}

export async function findByEmail(email) {
    return User.findOne({ email });
}

export async function findByUseridWithPassword(userid, email) {
    return User.findOne({ $or: [{ userid }, { email }] }).select("+password");
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
    return User.findById(userId)
        .select("-password")
        .populate({
            path: 'trips',
            select: 'status'  // status만 필요
        })
        .populate({
            path: 'bucketlists',
            select: 'isCompleted'  // isCompleted만 필요
        });
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

export async function updateTripDesign(userId, tripId, style) {
    const update = {};

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const tripObjectId = new mongoose.Types.ObjectId(tripId);

    // 1. Trip title (구성원들과 공유)
    if (style.title !== undefined) {
        await updateTripTitle(tripObjectId, userObjectId, style.title);
    }

    // 2. User 개인 스타일
    if (style.emoji !== undefined) {
        update[`userTripStyles.${tripObjectId}.emoji`] = style.emoji;
    }

    if (style.color !== undefined) {
        update[`userTripStyles.${tripObjectId}.color`] = style.color;
    }

    // 3. 개인 스타일 변경이 있을 때만 User 업데이트
    let user = null;
    if (Object.keys(update).length > 0) {
        user = await User.findByIdAndUpdate(
            userId,
            { $set: update },
            { new: true, projection: { userTripStyles: 1 } }
        );
    }

    return {
        updatedTitle: style.title ?? undefined,
        userTripStyles: user?.userTripStyles?.[tripObjectId],
    };
}
