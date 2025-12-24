import * as budgetDao from "../dao/budget.mjs";
import * as tripDao from "../dao/trip.mjs";

// 지출 추가
export async function createExpense(req, res) {
  try {
    let { tripId, name, category, amount } = req.body;
    const userId = req.user._id;

    // tripId가 없으면 사용자의 최근 여행을 자동으로 찾음
    if (!tripId) {
      const trips = await tripDao.findTripsByUserId(userId);
      if (trips && trips.length > 0) {
        tripId = trips[0]._id; // 가장 최근 여행
        console.log(`🔍 tripId 자동 설정: ${tripId}`);
      } else {
        return res.status(400).json({
          message: "여행 정보를 찾을 수 없습니다. 먼저 여행을 생성해주세요.",
        });
      }
    }

    if (!name || !category || !amount) {
    const { tripId, name, category, amount } = req.body; 
    const userId = req.user._id;

    // tripId가 없으면 사용자의 최근 여행을 자동으로 찾음
    if (!tripId) {
      const trips = await tripDao.findTripsByUserId(userId);
      if (trips && trips.length > 0) {
        tripId = trips[0]._id; // 가장 최근 여행
        console.log(`🔍 tripId 자동 설정: ${tripId}`);
      } else {
        return res.status(400).json({
          message: "여행 정보를 찾을 수 없습니다. 먼저 여행을 생성해주세요.",
        });
      }
    }

    if (!name || !category || !amount) {
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
  } 
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

// 지출 수정
export async function updateExpense(req, res) {
  try {
    const { expenseId } = req.params;
    const userId = req.user._id;
    const { name, category, amount } = req.body;

    if (!name || !category || !amount) {
      return res.status(400).json({
        message: "필수 항목을 모두 입력해주세요.",
      });
    }

    const updateData = {
      name,
      category,
      amount: Number(amount),
    };

    const updated = await budgetDao.updateExpense(expenseId, userId, updateData);

    if (!updated) {
      return res.status(404).json({
        message: "지출을 찾을 수 없거나 수정 권한이 없습니다.",
      });
    }

    res.json({
      message: "지출이 수정되었습니다.",
      expense: updated,
    });
  } catch (error) {
    console.error("지출 수정 오류:", error);
    res.status(500).json({
      message: "지출 수정 중 오류가 발생했습니다.",
    });
  }
}

// 지출 삭제
export async function deleteExpense(req, res) {
  try {
    const { expenseId } = req.params;
    const userId = req.user._id;

    const deleted = await budgetDao.deleteExpense(expenseId, userId);

    if (!deleted) {
      return res.status(404).json({
        message: "지출을 찾을 수 없거나 삭제 권한이 없습니다.",
      });
    }

    res.json({
      message: "지출이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("지출 삭제 오류:", error);
    res.status(500).json({
      message: "지출 삭제 중 오류가 발생했습니다.",
    });
  }
}