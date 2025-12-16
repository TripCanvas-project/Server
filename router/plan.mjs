import express from "express";
import { spawn } from "node:child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { isAuth } from "../middleware/auth.mjs";
import "dotenv/config";

import Trip from "../models/Trip.mjs";
import Route from "../models/Route.mjs";
import Place from "../models/Place.mjs";

const router = express.Router();

// ✅ ESM에서 __dirname 만들기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ router 폴더의 상위가 Server 루트
const PROJECT_ROOT = path.resolve(__dirname, "..");

router.post("/generate", isAuth, async (req, res) => {
    try {
        // ✅ isAuth에서 넣어준 userId 사용
        const userId = req.userId;

        if (!userId) {
            return res
                .status(401)
                .json({ message: "인증 정보가 없습니다(userId)" });
        }

        const userInput = { ...req.body, userId };

        // ✅ Server/controller/TripPlan.py
        const pythonScriptPath = path.join(
            PROJECT_ROOT,
            "controller",
            "TripPlan.py"
        );

        console.log("pythonScriptPath =", pythonScriptPath);
        console.log(
            "controller files =",
            fs.readdirSync(path.join(PROJECT_ROOT, "controller"))
        );

        const py = spawn("python", [pythonScriptPath], {
            env: { ...process.env, PYTHONIOENCODING: "utf-8" },
        });

        // Python 출력 모으기
        let pythonOutput = "";
        let pythonError = "";

        py.stdout.on("data", (data) => {
            pythonOutput += data.toString();
        });

        py.stderr.on("data", (data) => {
            const msg = data.toString();
            pythonError += msg;
            console.error("🐍 Python:", msg);
        });

        py.on("error", (err) => {
            console.error("❌ Python spawn error:", err);
        });

        // 입력 전달
        py.stdin.write(JSON.stringify(userInput));
        py.stdin.end();

        // ✅ close에서 결과 처리
        py.on("close", async (code) => {
            try {
                if (code !== 0) {
                    // stdout에 JSON이 있으면 그걸 우선 응답
                    try {
                        const maybe = JSON.parse(pythonOutput);
                        if (maybe?.error?.type === "GEMINI_UNAVAILABLE") {
                            return res.status(503).json(maybe);
                        }
                    } catch {}
                    return res
                        .status(500)
                        .json({ message: "Python 실행 실패", code });
                }

                if (!pythonOutput || !pythonOutput.trim()) {
                    return res.status(500).json({
                        message: "Python 출력이 비어있습니다. (stdout empty)",
                        stderr: pythonError || "(no stderr)",
                    });
                }

                /* ===============================
           1️⃣ Gemini 결과 파싱
        =============================== */
                let aiResult;
                try {
                    aiResult = JSON.parse(pythonOutput);
                    if (aiResult?.error?.type === "GEMINI_UNAVAILABLE") {
                        return res.status(503).json(aiResult);
                    }
                } catch (e) {
                    return res.status(500).json({
                        message: "Python 출력 JSON 파싱 실패",
                        error: String(e),
                        stdoutPreview: pythonOutput.slice(0, 2000),
                        stderr: pythonError || "(no stderr)",
                    });
                }

                /* ===============================
           2️⃣ Trip 생성
        =============================== */
                const trip = await Trip.create({
                    title: aiResult.title,
                    description: aiResult.description,
                    owner: userId,

                    startDate: new Date(req.body.start_date),
                    endDate: new Date(req.body.end_date),
                    duration:
                        (new Date(req.body.end_date) -
                            new Date(req.body.start_date)) /
                            (1000 * 60 * 60 * 24) +
                        1,

                    origin: {
                        inputText: req.body.start_loc,
                    },

                    destination: {
                        city: req.body.end_area,
                        district: req.body.detail_addr || "",
                        name: `${req.body.end_area} ${
                            req.body.detail_addr || ""
                        }`.trim(),
                    },

                    categories: req.body.place_themes
                        ? req.body.place_themes
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean)
                        : [],

                    peopleCount: req.body.total_people,

                    constraints: {
                        budget: {
                            perPerson: req.body.budget_per_person,
                            total:
                                req.body.budget_per_person *
                                req.body.total_people,
                        },
                    },
                });

                /* ===============================
           3️⃣ Place 미리 조회 (선택)
        =============================== */
                const placesInCity = await Place.find({
                    "address.city": req.body.end_area,
                }).select("_id coordinates.coordinates title");

                const placeMap = new Map(
                    placesInCity.map((p) => [
                        `${p.coordinates.coordinates[0].toFixed(
                            6
                        )},${p.coordinates.coordinates[1].toFixed(6)}`, // lng,lat
                        p._id,
                    ])
                );

                const parseCoords = (coords) => {
                    if (!coords) return null;

                    // python에서 "위도, 경도" 문자열을 준다고 했으니 lat,lng 순서
                    const [lat, lng] = coords
                        .split(",")
                        .map((v) => Number(v.trim()));

                    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
                        return null;
                    }

                    return { lat, lng };
                };

                /* ===============================
           4️⃣ dailyPlans 생성
        =============================== */
                const dailyPlans = (aiResult.travel_plan || []).map(
                    (dayPlan, dayIndex) => {
                        const date = new Date(trip.startDate);
                        date.setDate(date.getDate() + dayIndex);

                        const places = (dayPlan.places || []).map(
                            (place, idx) => {
                                const coord = parseCoords(place.coords);
                                const key = coord
                                    ? `${coord.lng.toFixed(
                                          6
                                      )},${coord.lat.toFixed(6)}`
                                    : null;

                                return {
                                    order: idx + 1,
                                    placeId: key
                                        ? placeMap.get(key) || null
                                        : null,
                                    placeName: place.name,
                                    coordinates: coord,
                                    scheduledTime: 0,
                                    estimatedDuration: 0,
                                    estimatedCost: place.estimated_cost || 0,
                                    description: place.description,
                                    closestSubway: place.closest_subway,
                                };
                            }
                        );

                        const accommodation =
                            dayPlan.accommodation?.name &&
                            dayPlan.accommodation.name !== "없음"
                                ? (() => {
                                      const coord = parseCoords(
                                          dayPlan.accommodation.coords
                                      );
                                      const key = coord
                                          ? `${coord.lng.toFixed(
                                                6
                                            )},${coord.lat.toFixed(6)}`
                                          : null;

                                      return {
                                          placeId: key
                                              ? placeMap.get(key) || null
                                              : null,
                                          placeName: dayPlan.accommodation.name,
                                          coordinates: coord,
                                          checkInTime: "15:00",
                                          checkOutTime: "11:00",
                                          estimatedCost:
                                              dayPlan.accommodation
                                                  .estimated_cost || 0,
                                          closestSubway:
                                              dayPlan.accommodation
                                                  .closest_subway,
                                      };
                                  })()
                                : null;

                        return {
                            day: dayPlan.day,
                            date,
                            places,
                            accommodation,
                            dayStats: {
                                totalCost:
                                    places.reduce(
                                        (s, p) => s + (p.estimatedCost || 0),
                                        0
                                    ) + (accommodation?.estimatedCost || 0),
                                placeCount: places.length,
                            },
                        };
                    }
                );

                /* ===============================
           5️⃣ Route 생성
        =============================== */
                const route = await Route.create({
                    tripId: trip._id,
                    name: "AI 생성 일정",
                    version: 1,
                    type: "original",
                    dailyPlans,
                    totalCost: dailyPlans.reduce(
                        (s, d) => s + (d.dayStats?.totalCost || 0),
                        0
                    ),
                    generatedBy: "gemini-ai",
                });

                /* ===============================
           6️⃣ Trip ↔ Route 연결
        =============================== */
                trip.activeRoute = route._id;
                await trip.save();

                /* ===============================
           7️⃣ 응답
        =============================== */
                return res.status(201).json({
                    message: "Trip + Route 생성 완료",
                    tripId: trip._id,
                    routeId: route._id,
                });
            } catch (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Trip/Route 생성 실패",
                    error: String(err),
                    stderr: pythonError || "(no stderr)",
                });
            }
        });
    } catch (err) {
        console.error(err);
        return res
            .status(500)
            .json({ message: "실행 실패", error: String(err) });
    }
});

export default router;
