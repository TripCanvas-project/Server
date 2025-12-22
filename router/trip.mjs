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

router.get("/create", isAuth, tripController.createTrip);

export default router;
