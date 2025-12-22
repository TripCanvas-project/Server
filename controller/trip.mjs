import * as tripRepository from "../dao/trip.mjs";
import * as userRepository from "../dao/user.mjs";

export async function getTripsForStatus(req, res) {
    const { status } = req.query;
    const userId = req.userId;

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
        console.log("User Trip Histories:", histories);

        res.status(200).json(histories);
    } catch (err) {
        console.error("getUserTripHistory Error:", err);
        res.status(500).json({
            message: "여행 히스토리 조회에 실패했습니다",
        });
    }
}
