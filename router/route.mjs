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

  // string이면 그대로
  if (typeof v === "string") return v;

  // ObjectId처럼 toString 되는 값
  if (typeof v === "object") {
    // { placeId: "..." } 형태
    if (typeof v.placeId === "string") return v.placeId;

    // { placeId: ObjectId } 형태
    if (v.placeId && typeof v.placeId === "object") {
      // { placeId: { _id: ... } } 형태
      if (v.placeId._id) return String(v.placeId._id);
      return String(v.placeId);
    }

    // { _id: ... } 형태
    if (v._id) return String(v._id);

    // ObjectId 자체일 수도
    return String(v);
  }

  return null;
}

/**
 * ✅ Place.coordinates(GeoJSON Point: [lng,lat]) / {lat,lng} 어떤 형태든
 * 프론트에서 쓰기 좋게 {lat,lng}로 통일
 */
function toLatLng(coords) {
  if (!coords) return null;

  // 이미 {lat,lng}
  if (
    typeof coords === "object" &&
    typeof coords.lat === "number" &&
    typeof coords.lng === "number"
  ) {
    return { lat: coords.lat, lng: coords.lng };
  }

  // GeoJSON Point: { type:"Point", coordinates:[lng,lat] }
  if (
    typeof coords === "object" &&
    coords.type === "Point" &&
    Array.isArray(coords.coordinates) &&
    coords.coordinates.length >= 2
  ) {
    const [lng, lat] = coords.coordinates;
    if (typeof lat === "number" && typeof lng === "number") {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * ✅ Place 문서에서 프론트에서 쓰기 좋은 형태로 normalize
 * - title -> placeName에 대응
 * - address.full -> addressFull
 * - coordinates -> {lat,lng}
 */
function pickPlaceInfo(doc) {
  if (!doc) return null;

  return {
    placeId: String(doc._id),
    title: doc.title ?? null,
    category: doc.category ?? null,
    addressFull: doc.address?.full ?? null,
    coordinates: toLatLng(doc.coordinates),
  };
}

/**
 * GET /route/latest
 * - 로그인 유저의 최신 Route를 가져오고
 * - Route 안의 places/accommodation에 Place 정보를 붙여서 내려줌
 * - effectiveAccommodation: 오늘 숙소가 없으면 직전 숙소를 내려줌
 */
router.get("/latest", isAuth, async (req, res) => {
  try {
    const userId = req.userId;

    // 1) 유저 Trip 목록
    const trips = await Trip.find({ owner: userId }).select("_id").lean();
    const tripIds = trips.map((t) => t._id);

    if (tripIds.length === 0) {
      return res.status(404).json({ message: "저장된 Trip이 없습니다." });
    }

    // 2) 최신 Route 1개
    const route = await Route.findOne({ tripId: { $in: tripIds } })
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    if (!route) {
      return res.status(404).json({ message: "저장된 Route가 없습니다." });
    }

    // 3) Route에서 placeId + accommodationId 전부 수집 (중복 제거)
    const idSet = new Set();

    for (const dp of route.dailyPlans || []) {
      // places의 placeId
      for (const p of dp.places || []) {
        const pid = normalizeId(p?.placeId);
        if (pid) idSet.add(String(pid));
      }

      // accommodation의 placeId (없을 수도 있으니 안전하게)
      const accId = normalizeId(dp?.accommodation?.placeId);
      if (accId) idSet.add(String(accId));
    }

    // ✅ ObjectId로 쿼리할 수 있는 것만 남김 (캐스팅 에러 방지)
    const allIds = [...idSet].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    // 4) Place에서 필요한 필드 한 번에 조회
    const placeDocs = await Place.find({ _id: { $in: allIds } })
      .select("category title address.full coordinates")
      .lean();

    const placeMap = new Map(placeDocs.map((p) => [String(p._id), p]));

    // 5) dailyPlans에 Place 정보 붙이기 (좌표는 {lat,lng}로 통일)
    const dailyPlansWithPlaceInfo = (route.dailyPlans || []).map((dp) => {
      // accommodation
      const accId = normalizeId(dp?.accommodation?.placeId);
      const accDoc = accId ? placeMap.get(String(accId)) : null;

      // ✅ 오늘 숙소(프론트용 normalize)
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
        const pid = normalizeId(p?.placeId);
        const doc = pid ? placeMap.get(String(pid)) : null;

        return {
          ...p,

          // 보강 필드들 (프론트에서 바로 쓰기 좋게)
          category: doc?.category ?? p.category ?? null,
          placeName: p.placeName || doc?.title || p.name || null,
          addressFull: doc?.address?.full ?? p.addressFull ?? null,
          coordinates:
            toLatLng(doc?.coordinates) ?? toLatLng(p.coordinates) ?? null,
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
      if (dp?.accommodation?.placeId) {
        lastAcc = dp.accommodation;
      }

      return {
        ...dp,
        effectiveAccommodation: lastAcc ? { ...lastAcc } : null,
      };
    });

    const routeWithInfo = {
      ...route,
      dailyPlans: dailyPlansWithEffective,
    };

    return res.json({ route: routeWithInfo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "latest route 조회 실패" });
  }
});

/**
 * POST /route/directions
 * - 프론트가 준 origin/destination/waypoints로 카카오모빌리티 길찾기 호출
 * - polyline points({lat,lng}) 형태로 반환
 *
 * body 예시:
 * {
 *   "origin": "127.1540833932,35.817075192",
 *   "destination": "127.1600,35.8200",
 *   "waypoints": ["127.155,35.818", "127.156,35.819"],
 *   "priority": "TIME"
 * }
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
    url.searchParams.set("origin", origin); // "x,y" (lng,lat)
    url.searchParams.set("destination", destination); // "x,y"
    url.searchParams.set("priority", priority);

    if (Array.isArray(waypoints) && waypoints.length) {
      url.searchParams.set("waypoints", waypoints.join("|")); // "x,y|x,y|..."
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

    // ✅ 모든 sections의 roads.vertexes(x1,y1,x2,y2,...)를 합쳐서 points로 변환
    const points = [];
    for (const section of route0?.sections || []) {
      for (const road of section?.roads || []) {
        const v = road?.vertexes || [];
        for (let i = 0; i < v.length - 1; i += 2) {
          const x = v[i]; // lng
          const y = v[i + 1]; // lat
          points.push({ lat: y, lng: x });
        }
      }
    }

    return res.json({ points });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "directions 서버 오류" });
  }
});

export default router;
