import User from "../models/User.js";

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
