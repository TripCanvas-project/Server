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
