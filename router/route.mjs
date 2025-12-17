import express from "express";
import { isAuth } from "../middleware/auth.mjs";
import Trip from "../models/Trip.mjs";
import Route from "../models/Route.mjs";
import Place from "../models/Place.mjs";

const router = express.Router();

router.get("/latest", isAuth, async (req, res) => {
  try {
    const userId = req.userId;

    const trips = await Trip.find({ owner: userId }).select("_id").lean();
    const tripIds = trips.map((t) => t._id);

    if (tripIds.length === 0) {
      return res.status(404).json({ message: "저장된 Trip이 없습니다." });
    }

    const route = await Route.findOne({ tripId: { $in: tripIds } })
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    if (!route) {
      return res.status(404).json({ message: "저장된 Route가 없습니다." });
    }

    // ✅ 1) dailyPlans[].places[] 에서 placeId 전부 수집
    const placeIds = (route.dailyPlans || [])
      .flatMap((dp) => dp.places || [])
      .map((p) => p.placeId)
      .filter(Boolean);

    // ✅ 2) Place에서 category만 한번에 조회
    const placeDocs = await Place.find({ _id: { $in: placeIds } })
      .select("category")
      .lean();

    const placeMap = new Map(placeDocs.map((p) => [String(p._id), p]));

    // ✅ 3) route에 category를 붙여서 내려주기
    const routeWithCategory = {
      ...route,
      dailyPlans: (route.dailyPlans || []).map((dp) => ({
        ...dp,
        places: (dp.places || []).map((p) => ({
          ...p,
          category: placeMap.get(String(p.placeId))?.category ?? null,
        })),
      })),
    };

    let lastAcc = null;

    const dailyPlansWithEffective = (routeWithCategory.dailyPlans || []).map(
      (dp) => {
        // dp.accommodation 이 이미 { placeId, category, ... } 형태라고 가정
        // (없으면 null)
        const hasAcc =
          dp.accommodation &&
          (dp.accommodation.placeId || typeof dp.accommodation === "string");

        // accommodation을 placeId 기준으로 정규화
        const normalizedAcc = !dp.accommodation
          ? null
          : typeof dp.accommodation === "string"
          ? { placeId: dp.accommodation }
          : dp.accommodation;

        if (hasAcc && normalizedAcc?.placeId) {
          lastAcc = normalizedAcc; // 이번 day 숙소가 있으면 갱신
        }

        return {
          ...dp,
          // ✅ 오늘 찍을 숙소(없으면 직전 숙소)
          effectiveAccommodation: lastAcc ? { ...lastAcc } : null,
        };
      }
    );

    routeWithCategory.dailyPlans = dailyPlansWithEffective;

    return res.json({ route: routeWithCategory });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "latest route 조회 실패" });
  }
});

export default router;
