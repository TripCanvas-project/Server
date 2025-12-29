import * as tripRepository from "../dao/trip.mjs";
import * as userRepository from "../dao/user.mjs";
import crypto from "crypto";
import { PUBLIC_BASE_URL } from "../config/public_url.mjs";
import { HOST_URL } from "../config/host.mjs";

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

    const trip = await tripRepository.updateTrip(tripId, userId, updateData);

    if (!trip) {
      return res.status(404).json({ message: "여행을 찾을 수 없습니다." });
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
      return res.status(404).json({ message: "여행을 찾을 수 없습니다." });
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
    const { inviteToken, expiresAt } = await tripRepository.createTripInvite(
      tripId
    );

    console.log("Generated Invite Token:", inviteToken);

    // 초대 링크 생성 (ngrok dev server url 사용)
    const inviteLink = `${PUBLIC_BASE_URL}/trip/join/${inviteToken}`;

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
  const { inviteToken } = req.params;
  const userId = req.user.id;

  console.log("joinTripByInvite called with token:", inviteToken);
  console.log("joinedUserId:", userId);

  // 로그인 안 된 경우
  if (!userId) {
    return res.json({
      redirect: `${HOST_URL}/login.html?invite=${inviteToken}`,
    });
  }

  try {
    const trip = await tripRepository.findTripByInviteToken(inviteToken);
    if (!trip) return res.send("유효하지 않은 초대 링크입니다.");
    if (trip.invite.expiresAt < new Date())
      return res.send("만료된 초대 링크입니다.");

    const already = trip.collaborators.some(
      (c) => c.userId.toString() === userId
    );

    if (!already) {
      await tripRepository.addCollaborator(trip._id, userId);
    }

    const tripId = trip._id.toString(); // param으로 넘기기 위해 문자열로 변환
    return res.json({ redirect: `${HOST_URL}/main.html?tripId=${tripId}` }); // JSON 형식으로 리디렉션 URL 반환
  } catch (e) {
    console.error("joinTripByInvite error:", e);
    return res.json({
      redirect: `${HOST_URL}/login.html?invite=${inviteToken}`,
    }); // 오류 시 리디렉션 URL 반환
  }
}
