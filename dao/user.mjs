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

export async function updatePassword(newPw) {}

export async function updateProfile(userId, nickname, email, bio, profileImg) {
    // 만약에 이메일을 새로 수정했는데
    // 다른 사람이 그 이메일을 쓰고 있을 경우 수정 안 되도록
    const emailOwner = await User.findOne({ email });
    if (emailOwner) return false;

    const updatedUser = await User.findOneAndUpdate(
        { _id: userId },
        {
            $set: {
                nickname: nickname,
                email: email,
                bio: bio,
                profileImg: profileImg,
            },
        },
        { new: true }
    );

    return updatedUser;
}
