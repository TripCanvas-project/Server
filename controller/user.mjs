import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as userRepository from "../dao/user.mjs";
import * as tripRepository from "../dao/trip.mjs";
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
        const { userid, email, password } = req.body;

        const user = await userRepository.findByUseridWithPassword(
            userid || email
        );

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
            expiresIn: JWT_EXPIRES_SEC, // 48h
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
        const user = await userRepository.findById(req.user.id);

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

// 비번 변경
export const updatePw = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        const user = await userRepository.findByIdWithPassword(userId);
        if (!user) {
            return res.status(401).json({ message: "사용자 없음" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res
                .status(401)
                .json({ message: "현재 비밀번호가 틀렸습니다" });
        }

        const hashed = await bcrypt.hash(newPassword, BCRPYPT_SALT_ROUNDS);
        await userRepository.updatePassword(userId, hashed);

        res.status(200).json({ message: "비밀번호 변경 완료" });
    } catch (e) {
        res.status(500).json({ message: "비밀번호 변경 실패" });
    }
};

// 프로필 정보 변경
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const { nickname, email, bio } = req.body;

        const updatedUser = await userRepository.updateProfile(
            userId,
            nickname,
            email,
            bio,
            null // 이미지 변경 없음
        );

        return res.status(200).json({
            message: "프로필 정보가 수정되었습니다.",
            user: {
                id: updatedUser._id,
                userid: updatedUser.userid,
                nickname: updatedUser.nickname,
                email: updatedUser.email,
                bio: updatedUser.bio,
                profileImg: updatedUser.profileImg,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "프로필 정보 수정 실패",
        });
    }
};

// 프로필 이미지 업로드 및 변경
export const uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "파일이 없습니다." });
        }

        const userId = req.user.id;
        const imageUrl = `/uploads/${req.file.filename}`;

        const updatedUser = await userRepository.updateProfile(
            userId,
            null,
            null,
            null,
            imageUrl
        );

        res.status(200).json({
            message: "프로필 이미지가 변경되었습니다.",
            profileImg: updatedUser.profileImg,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "이미지 업로드 실패" });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        userRepository.deleteUser(id);
        res.status(200).json({ message: "회원 탈퇴 성공" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "회원 탈퇴 실패" });
    }
};

export async function getUserTripDesign(req, res) {
    try {
        const styles = await userRepository.getTripStyles(req.user.id);
        return res.status(200).json({ styles });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "스타일 조회 실패" });
    }
}

export async function customizeTripTemplate(req, res) {
    try {
        const userId = req.user.id;
        const { tripId } = req.params;
        const { emoji, color, title } = req.body;

        // 필수 값 체크
        if (!tripId) {
            return res.status(400).json({ message: "tripId는 필수입니다." });
        }

        // 여행 존재 + 권한 확인 (owner or collaborator)
        const trip = await tripRepository.findByIdAndUserOrCollaborator(
            tripId,
            userId
        );

        if (!trip) {
            return res.status(403).json({
                message: "해당 여행에 대한 권한이 없습니다.",
            });
        }

        // 최소 1개 값 체크
        if (!emoji && !color && title === undefined) {
            return res.status(400).json({
                message: "emoji 또는 color 또는 title 중 하나는 필요합니다.",
            });
        }

        // DAO 호출
        const { updatedTitle, updatedStyle } =
            await userRepository.updateTripDesign(userId, tripId, {
                // style
                emoji,
                color,
                title,
            });

        return res.status(200).json({
            updatedTitle,
            updatedStyle, // { emoji, color }
            message: "여행 카드 스타일이 저장되었습니다.",
        });
    } catch (err) {
        console.error("customizeTripTemplate error:", err);
        return res.status(500).json({
            message: "여행 카드 스타일 저장 실패",
        });
    }
}
