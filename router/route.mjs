import express from "express";
import { isAuth } from "../middleware/auth.mjs";
import Trip from "../models/Trip.mjs";
import Route from "../models/Route.mjs";

const router = express.Router();

// GET /api/routes/latest  (로그인 유저의 가장 최신 Route 1개)
router.get("/latest", isAuth, async (req, res) => {
  try {
    const userId = req.userId;

    // 1) 유저의 Trip id 목록
    const trips = await Trip.find({ owner: userId }).select("_id").lean();
    const tripIds = trips.map((t) => t._id);

    if (tripIds.length === 0) {
      return res.status(404).json({ message: "저장된 Trip이 없습니다." });
    }

    // 2) 그 Trip들 중 최신 Route 1개
    // createdAt이 없을 수도 있으니 _id도 같이 정렬(최신 ObjectId)
    const route = await Route.findOne({ tripId: { $in: tripIds } })
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    if (!route) {
      return res.status(404).json({ message: "저장된 Route가 없습니다." });
    }

    return res.json({ route });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "latest route 조회 실패" });
  }
});

export default router;
