import Budget from "../models/Budget.js";

// 지출 생성
export async function createExpense(expenseData) {
  console.log(`💰 [DAO] 지출 생성 - tripId: ${expenseData.tripId}, name: ${expenseData.name}`);
  const expense = new Budget(expenseData);
  const saved = await expense.save();
  console.log(`   ✅ 지출 저장 완료 - _id: ${saved._id}`);
  return saved;
}

// 특정 사용자의 특정 여행 지출 조회 (본인 것만)
export async function getMyExpenses(userId, tripId) {
  console.log(`📊 [DAO] 지출 조회 - userId: ${userId}, tripId: ${tripId}`);
  const expenses = await Budget.find({ userId, tripId }).sort({ date: -1 });
  console.log(`   ✅ ${expenses.length}개의 지출 항목 조회됨`);
  return expenses;
}

// 지출 수정
export async function updateExpense(expenseId, userId, updateData) {
  console.log(`✏️ [DAO] 지출 수정 - expenseId: ${expenseId}, userId: ${userId}`);
  const updated = await Budget.findOneAndUpdate(
    { _id: expenseId, userId },
    updateData,
    { new: true }
  );
  console.log(`   ✅ 지출 수정 완료`);
  return updated;
}

// 지출 삭제
export async function deleteExpense(expenseId, userId) {
  console.log(`🗑️ [DAO] 지출 삭제 - expenseId: ${expenseId}, userId: ${userId}`);
  const deleted = await Budget.findOneAndDelete({ _id: expenseId, userId });
  console.log(`   ✅ 지출 삭제 완료`);
  return deleted;
}