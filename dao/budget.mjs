import Budget from "../models/Budget.js";

// 지출 생성
export async function createExpense(expenseData) {
  const expense = new Budget(expenseData);
  return await expense.save();
}

// 특정 사용자의 특정 여행 지출 조회 (본인 것만)
export async function getMyExpenses(userId, tripId) {
  return await Budget.find({ userId, tripId }).sort({ date: -1 });
}
