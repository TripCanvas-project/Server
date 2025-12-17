import express from "express";
import * as scheduleController from "../controller/schedule.mjs";
import { isAuth } from "../middleware/auth.mjs";

const router = express.Router();

// 일정 추가
router.post("/", isAuth, scheduleController.createSchedule);

// 내 일정만 조회
router.get("/my/:tripId", isAuth, scheduleController.getMySchedules);

// 일정 수정
router.put("/:scheduleId", isAuth, scheduleController.updateSchedule);

// 일정 삭제
router.delete("/:scheduleId", isAuth, scheduleController.deleteSchedule);

export default router;
