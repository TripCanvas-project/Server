import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as userRepository from "../dao/user.mjs";
import {
  JWT_SECRET,
  JWT_EXPIRES_SEC,
  BCRPYPT_SALT_ROUNDS,
} from "../config/jwt.js";

export const signup = async (req, res) => {
  try {
    const { userid, password, nickname, email } = req.body;

    // 아이디 / 이메일 중복 체크
    const existsUserid = await userRepository.findByUserid(userid);
    const existsEmail = await userRepository.findByEmail(email);

    if (existsUserid || existsEmail) {
      return res.status(409).json({
        message: "이미 사용 중인 아이디 또는 이메일입니다",
      });
    }

    const hashedPassword = await bcrypt.hash(password, BCRPYPT_SALT_ROUNDS);

    const user = await userRepository.createUser({
      userid,
      password: hashedPassword,
      nickname,
      email,
    });

    return res.status(201).json({
      message: "회원가입 성공",
      user: {
        id: user._id,
        userid: user.userid,
        nickname: user.nickname,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("signup error:", error);
    return res.status(500).json({
      message: "회원가입 중 오류가 발생했습니다",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { userid, password } = req.body;

    const user = await userRepository.findByUseridWithPassword(userid);

    if (!user) {
      return res.status(401).json({
        message: "아이디 또는 비밀번호가 올바르지 않습니다",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "아이디 또는 비밀번호가 올바르지 않습니다",
      });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_SEC,
    });

    return res.status(200).json({
      message: "로그인 성공",
      token,
      user: {
        id: user._id,
        userid: user.userid,
        nickname: user.nickname,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({
      message: "로그인 중 오류가 발생했습니다",
    });
  }
};

export const me = async (req, res) => {
  try {
    const user = await userRepository.findById(req.userId);

    if (!user) {
      return res.status(401).json({
        message: "인증된 사용자가 아닙니다",
      });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("me error:", error);
    return res.status(500).json({
      message: "사용자 정보 조회 실패",
    });
  }
};
