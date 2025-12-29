import * as tripRepository from "../dao/trip.mjs";
import * as userRepository from "../dao/user.mjs";

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
            return res.status(404).json({ message: '여행을 찾을 수 없습니다.'})
        }

        return res.json({ trip });
    } catch (error) {
        console.error('Trip update error:', error);
        return res.status(500).json({
            message: '여행 업데이트 중 오류가 발생했습니다.',
            error: error.message
        })
    }
}

export async function deleteTrip(req, res) {
    try {
        const { tripId } = req.params;
        const userId = req.userId;

        const trip = await tripRepository.deleteTrip(tripId, userId);
    } catch (err) {
        console.error("deleteTrip error:", err);
        return res.status(500).json({ message: "여행 삭제 실패" });
    }

    return res.json({ message: "여행 삭제 성공" });
}
