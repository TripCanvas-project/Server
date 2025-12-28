import express from "express";
import mongoose from "mongoose";
import { isAuth } from "../middleware/auth.mjs";
import Trip from "../models/Trip.mjs";
import Route from "../models/Route.mjs";
import Place from "../models/Place.mjs";

const router = express.Router();

/**
 * ✅ ObjectId / string / { _id } / { placeId } 등 다양한 형태를 "문자열 id"로 통일해서 뽑는 함수
 */
function normalizeId(v) {
  if (!v) return null;
  if (typeof v === "string") return v;

  if (typeof v === "object") {
    if (typeof v.placeId === "string") return v.placeId;

    if (v.placeId && typeof v.placeId === "object") {
      if (v.placeId._id) return String(v.placeId._id);
      return String(v.placeId);
    }

    if (v._id) return String(v._id);
    return String(v);
  }

  return null;
}

/**
 * ✅ Place.coordinates(GeoJSON Point: [lng,lat]) / {lat,lng} 어떤 형태든 {lat,lng}로 통일
 */
function toLatLng(coords) {
  if (!coords) return null;

  if (
    typeof coords === "object" &&
    typeof coords.lat === "number" &&
    typeof coords.lng === "number"
  ) {
    return { lat: coords.lat, lng: coords.lng };
  }

  if (
    typeof coords === "object" &&
    coords.type === "Point" &&
    Array.isArray(coords.coordinates) &&
    coords.coordinates.length >= 2
  ) {
    const [lng, lat] = coords.coordinates;
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  }

  return null;
}

/**
 * ✅ Route에 Place 정보 붙이고 effectiveAccommodation 계산해서 반환
 * (latest / by-trip 둘 다 이 함수를 사용)
 */
async function enrichRoute(route) {
  // 3) Route에서 placeId + accommodationId 전부 수집 (중복 제거)
  const idSet = new Set();

  for (const dp of route.dailyPlans || []) {
    for (const p of dp.places || []) {
      const pid = normalizeId(p?.placeId ?? p);
      if (pid) idSet.add(String(pid));
    }

    const accId = normalizeId(dp?.accommodation?.placeId);
    if (accId) idSet.add(String(accId));
  }

  const allIds = [...idSet].filter((id) => mongoose.Types.ObjectId.isValid(id));

  // 4) Place에서 필요한 필드 한 번에 조회
  const placeDocs = await Place.find({ _id: { $in: allIds } })
    .select("category title address.full coordinates")
    .lean();

  const placeMap = new Map(placeDocs.map((p) => [String(p._id), p]));

  // 5) dailyPlans에 Place 정보 붙이기
  const dailyPlansWithPlaceInfo = (route.dailyPlans || []).map((dp) => {
    // accommodation
    const accId = normalizeId(dp?.accommodation?.placeId);
    const accDoc = accId ? placeMap.get(String(accId)) : null;

    const normalizedAcc = accId
      ? {
          placeId: String(accId),
          title: accDoc?.title ?? dp?.accommodation?.placeName ?? "숙소",
          category: accDoc?.category ?? "숙소",
          addressFull:
            accDoc?.address?.full ?? dp?.accommodation?.addressFull ?? null,
          coordinates:
            toLatLng(accDoc?.coordinates) ??
            toLatLng(dp?.accommodation?.coordinates) ??
            null,
          checkInTime: dp?.accommodation?.checkInTime ?? null,
          checkOutTime: dp?.accommodation?.checkOutTime ?? null,
          estimatedCost: dp?.accommodation?.estimatedCost ?? null,
          closestSubway: dp?.accommodation?.closestSubway ?? null,
        }
      : null;

    // places
    const placesWithInfo = (dp.places || []).map((p) => {
      const pid = normalizeId(p?.placeId ?? p);
      const doc = pid ? placeMap.get(String(pid)) : null;

      const base =
        typeof p === "string"
          ? { placeId: String(p) }
          : { ...p, placeId: String(pid || p.placeId || "") };

      return {
        ...base,

        description:
          (typeof p === "object" &&
            (p.description ?? p.desc ?? p.overview ?? p.summary)) ??
          null,

        category: doc?.category ?? base.category ?? null,

        placeName: base.placeName || doc?.title || base.name || null,
        addressFull: doc?.address?.full ?? base.addressFull ?? null,
        coordinates:
          toLatLng(doc?.coordinates) ?? toLatLng(base.coordinates) ?? null,
      };
    });

    return {
      ...dp,
      accommodation: normalizedAcc,
      places: placesWithInfo,
    };
  });

  // 6) effectiveAccommodation 계산 (오늘 숙소 없으면 직전 숙소)
  let lastAcc = null;
  const dailyPlansWithEffective = dailyPlansWithPlaceInfo.map((dp) => {
    if (dp?.accommodation?.placeId) lastAcc = dp.accommodation;
    return { ...dp, effectiveAccommodation: lastAcc ? { ...lastAcc } : null };
  });

  return { ...route, dailyPlans: dailyPlansWithEffective };
}

/**
 * GET /route/latest
 */
router.get("/latest", isAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    const trips = await Trip.find({ owner: userId }).select("_id").lean();
    const tripIds = trips.map((t) => t._id);

    if (!tripIds.length) {
      return res.status(404).json({ message: "저장된 Trip이 없습니다." });
    }

    const route = await Route.findOne({ tripId: { $in: tripIds } })
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    if (!route) {
      return res.status(404).json({ message: "저장된 Route가 없습니다." });
    }

    const routeWithInfo = await enrichRoute(route);
    return res.json({ route: routeWithInfo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "latest route 조회 실패" });
  }
});

/**
 * POST /route/directions
 */
router.post("/directions", isAuth, async (req, res) => {
  try {
    const { origin, destination, waypoints = [], priority = "TIME" } = req.body;

    if (!origin || !destination) {
      return res
        .status(400)
        .json({ message: "origin/destination이 필요합니다." });
    }

    const url = new URL("https://apis-navi.kakaomobility.com/v1/directions");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    url.searchParams.set("priority", priority);

    if (Array.isArray(waypoints) && waypoints.length) {
      url.searchParams.set("waypoints", waypoints.join("|"));
    }

    const r = await fetch(url.toString(), {
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_MOBILITY_REST_KEY}`,
      },
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("Kakao directions error:", data);
      return res
        .status(r.status)
        .json({ message: "Kakao directions 실패", detail: data });
    }

    const route0 = data?.routes?.[0];

    const points = [];
    for (const section of route0?.sections || []) {
      for (const road of section?.roads || []) {
        const v = road?.vertexes || [];
        for (let i = 0; i < v.length - 1; i += 2) {
          points.push({ lat: v[i + 1], lng: v[i] }); // y=lat, x=lng
        }
      }
    }

    const distanceM =
      route0?.summary?.distance ??
      (route0?.sections || []).reduce((sum, s) => sum + (s?.distance || 0), 0);

    const durationS =
      route0?.summary?.duration ??
      (route0?.sections || []).reduce((sum, s) => sum + (s?.duration || 0), 0);

    return res.json({ points, distanceM, durationS });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "directions 서버 오류" });
  }
});

/**
 * ✅ GET /route/by-trip/:tripId
 */
router.get("/by-trip/:tripId", isAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { tripId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({ message: "잘못된 tripId" });
    }

    const trip = await Trip.findOne({ _id: tripId, owner: userId })
      .select("_id")
      .lean();

    if (!trip) {
      return res.status(404).json({ message: "Trip을 찾을 수 없습니다." });
    }

    const route = await Route.findOne({ tripId: trip._id })
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    if (!route) {
      return res.status(404).json({ message: "해당 Trip의 Route가 없습니다." });
    }

    const routeWithInfo = await enrichRoute(route);
    return res.json({ route: routeWithInfo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "by-trip route 조회 실패" });
  }
});

export default router;
