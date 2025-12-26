import express from "express";
import { isAuth } from "../middleware/auth.mjs";
import Trip from "../models/Trip.mjs";
import * as tripController from "../controller/trip.mjs";

const router = express.Router();

// GET /trip/mine  - 로그인 유저의 Trip 목록
router.get("/mine", isAuth, async (req, res) => {
    const userId = req.userId;
    const trips = await Trip.find({ owner: userId })
        .sort({ createdAt: -1, _id: -1 })
        .select("title description startDate endDate createdAt")
        .lean();

    return res.json({ trips });
});

// user의 최근 여행 기록 조회
router.get("/trip_history", isAuth, tripController.getUserTripHistory);

router.get("/", isAuth, tripController.getTripsForStatus);

// GET /trip/:tripId - 특정 여행 정보 조회 (예산 정보 포함)
router.get("/:tripId", isAuth, async (req, res) => {
    try {
        const { tripId } = req.params;
        const userId = req.userId;

        const trip = await Trip.findOne({ _id: tripId, owner: userId }).lean();

        if (!trip) {
            return res.status(404).json({ message: "여행을 찾을 수 없습니다." });
        }

        return res.json({ trip });
    } catch (error) {
        console.error("여행 정보 조회 오류:", error);
        return res.status(500).json({ message: "여행 정보 조회 중 오류가 발생했습니다." });
    }
});

router.post("/", isAuth, tripController.createTrip);

router.put("/:tripId", isAuth, tripController.updateTrip);

export default router;
