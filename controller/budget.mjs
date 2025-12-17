import * as budgetDao from "../dao/budget.mjs";

// 지출 추가
export async function createExpense(req, res) {
  try {
    const { tripId, name, category, amount } = req.body; 
    const userId = req.user._id;

    if (!tripId || !name || !category || !amount) {
      return res.status(400).json({
        message: "필수 항목을 모두 입력해주세요.",
      });
    }

    const expense = await budgetDao.createExpense({
      tripId,
      userId,
      name,
      category,
      amount: Number(amount),
    });

    res.status(201).json({
      message: "지출이 추가되었습니다.",
      expense,
    });
  } catch (error) {
    console.error("지출 추가 오류:", error);
    res.status(500).json({
      message: "지출 추가 중 오류가 발생했습니다.",
    });
  }
}

// 내 지출만 조회 (본인 것만)
export async function getMyExpenses(req, res) {
  try {
    const { tripId } = req.params;
    const userId = req.user._id;

    const expenses = await budgetDao.getMyExpenses(userId, tripId);

    res.json({
      expenses,
      count: expenses.length,
    });
  } catch (error) {
    console.error("지출 조회 오류:", error);
    res.status(500).json({
      message: "지출 조회 중 오류가 발생했습니다.",
    });
  }
}
