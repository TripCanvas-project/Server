import express from "express";
import * as budgetController from "../controller/budget.mjs";
import { authenticate } from "../middleware/auth.mjs";

const router = express.Router();

// 지출 추가
router.post("/", authenticate, budgetController.createExpense);

// 내 지출만 조회
router.get("/my/:tripId", authenticate, budgetController.getMyExpenses);

export default router;
