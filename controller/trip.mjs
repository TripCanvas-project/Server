import * as tripRepository from "../dao/trip.mjs";
import * as userRepository from "../dao/user.mjs";
import crypto from "crypto";

export async function getTripsForStatus(req, res) {
    const { status } = req.query;
    const userId = req.user.id;

    try {
        const trips = status
            ? await tripRepository.findTripsByUserIdAndStatus(userId, status)
            : await tripRepository.findTripsByUserId(userId);

        return res.status(200).json(trips);
    } catch (error) {
        console.error("getTripsForStatus 에러:", error);
        return res.status(500).json({ message: "서버 오류" });
    }
}

export async function getUserTripHistory(req, res) {
    try {
        const { userId } = req;

        const histories = await tripRepository.findTripHistoryByUserId(userId);

        res.status(200).json(histories);
    } catch (err) {
        console.error("getUserTripHistory Error:", err);
        res.status(500).json({
            message: "여행 히스토리 조회에 실패했습니다",
        });
    }
}

export async function createTrip(req, res) {
    try {
        const userId = req.userId; // 로그인한 사용자
        const { title, destination, startDate, endDate, status } = req.body;

        console.log("create 요청 받음");

        const newTrip = await tripRepository.createTrip(userId, {
            title,
            destination,
            startDate,
            endDate,
            status,
        });
        console.log("Created New Trip:", newTrip);
        res.status(201).json(newTrip);
    } catch (err) {
        console.error("createTrip error:", err);
        res.status(500).json({ message: "새 여행 생성 실패" });
    }
}

export const updateTrip = async (req, res) => {
    try {
        const { tripId } = req.params;
        const userId = req.userId;
        const updateData = req.body;

        const trip = await tripRepository.updateTrip(
            tripId,
            userId,
            updateData
        );

        if (!trip) {
            return res
                .status(404)
                .json({ message: "여행을 찾을 수 없습니다." });
        }

        return res.json({ trip });
    } catch (error) {
        console.error("Trip update error:", error);
        return res.status(500).json({
            message: "여행 업데이트 중 오류가 발생했습니다.",
            error: error.message,
        });
    }
};

export async function inviteCollaborator(req, res) {
    try {
        const { tripId } = req.params;

        // 여행 조회
        const trip = await tripRepository.findById(tripId);

        if (!trip) {
            return res
                .status(404)
                .json({ message: "여행을 찾을 수 없습니다." });
        }

        // 권한 체크 (owner 또는 editor)
        // const hasPermission =
        //     trip.owner.toString() === userId ||
        //     trip.collaborators.some(
        //         (c) =>
        //             c.userId.toString() === userId &&
        //             ["owner", "editor"].includes(c.role)
        //     );

        // if (!hasPermission) {
        //     return res.status(403).json({ message: "초대 권한이 없습니다." });
        // }

        // 초대 토큰 생성 (DAO)
        const { inviteToken, expiresAt } =
            await tripRepository.createTripInvite(tripId);

        console.log("Generated Invite Token:", inviteToken);

        // 초대 링크 생성
        const inviteLink = `http://localhost:8080/invite/${inviteToken}`;

        console.log("Generated Invite Link:", inviteLink);

        return res.status(200).json({
            message: "초대 링크가 생성되었습니다.",
            inviteLink,
            expiresAt,
        });
    } catch (error) {
        console.error("inviteCollaborator(초대 링크 생성) 에러:", error);
        return res.status(500).json({ message: "서버 오류" });
    }
}

export async function joinTripByInvite(req, res) {
    try {
        const { inviteToken } = req.params;
        const userId = req.user.id;

        // 토큰으로 여행 조회
        const trip = await tripRepository.findTripByInviteToken(inviteToken);
        if (!trip) {
            return res.status(400).json({ message: "유효하지 않은 초대 링크" });
        }

        if (!trip.invite?.expiresAt || trip.invite.expiresAt < new Date()) {
            return res.status(400).json({ message: "만료된 초대 링크" });
        }

        // 이미 참여한 사용자인지 확인
        const alreadyJoined = trip.collaborators.some(
            (c) => c.userId.toString() === userId
        );

        if (alreadyJoined) {
            return res.status(200).json({ message: "이미 참여한 여행입니다." });
        }

        await tripRepository.addCollaborator(trip._id, userId);

        return res.status(200).json({ message: "여행에 참여했습니다." });
    } catch (error) {
        console.error("joinTripByInvite 에러:", error);
        return res.status(500).json({ message: "서버 오류" });
    }
}
