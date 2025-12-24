import express from "express";
import * as budgetController from "../controller/budget.mjs";
import { isAuth } from "../middleware/auth.mjs";

const router = express.Router();

// 지출 추가
router.post("/", isAuth, budgetController.createExpense);

// 내 지출만 조회
router.get("/my/:tripId", isAuth, budgetController.getMyExpenses);

// 지출 수정
router.put("/:expenseId", isAuth, budgetController.updateExpense);

// 지출 삭제
router.delete("/:expenseId", isAuth, budgetController.deleteExpense);

export default router;