import * as scheduleDao from "../dao/schedule.mjs";

// 일정 추가
export async function createSchedule(req, res) {
  try {
    const { tripId, time, title, location } = req.body;
    const userId = req.user._id;

    if (!tripId || !time || !title || !location) {
      return res.status(400).json({
        message: "필수 항목을 모두 입력해주세요.",
      });
    }

    const schedule = await scheduleDao.createSchedule({
      tripId,
      userId,
      time,
      title,
      location,
    });

    res.status(201).json({
      message: "일정이 추가되었습니다.",
      schedule,
    });
  } catch (error) {
    console.error("일정 추가 오류:", error);
    res.status(500).json({
      message: "일정 추가 중 오류가 발생했습니다.",
    });
  }
}

// 내 일정만 조회 (본인 것만)
export async function getMySchedules(req, res) {
  try {
    const { tripId } = req.params;
    const userId = req.user._id;

    const schedules = await scheduleDao.getMySchedules(userId, tripId);

    res.json({
      schedules,
      count: schedules.length,
    });
  } catch (error) {
    console.error("일정 조회 오류:", error);
    res.status(500).json({
      message: "일정 조회 중 오류가 발생했습니다.",
    });
  }
}

// 일정 수정
export async function updateSchedule(req, res) {
  try {
    const { scheduleId } = req.params;
    const { time, title, location } = req.body;
    const userId = req.user._id;

    if (!time || !title || !location) {
      return res.status(400).json({
        message: "필수 항목을 모두 입력해주세요.",
      });
    }

    const schedule = await scheduleDao.updateSchedule(scheduleId, userId, {
      time,
      title,
      location,
    });

    if (!schedule) {
      return res.status(404).json({
        message: "일정을 찾을 수 없거나 수정 권한이 없습니다.",
      });
    }

    res.json({
      message: "일정이 수정되었습니다.",
      schedule,
    });
  } catch (error) {
    console.error("일정 수정 오류:", error);
    res.status(500).json({
      message: "일정 수정 중 오류가 발생했습니다.",
    });
  }
}

// 일정 삭제
export async function deleteSchedule(req, res) {
  try {
    const { scheduleId } = req.params;
    const userId = req.user._id;

    const schedule = await scheduleDao.deleteSchedule(scheduleId, userId);

    if (!schedule) {
      return res.status(404).json({
        message: "일정을 찾을 수 없거나 삭제 권한이 없습니다.",
      });
    }

    res.json({
      message: "일정이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("일정 삭제 오류:", error);
    res.status(500).json({
      message: "일정 삭제 중 오류가 발생했습니다.",
    });
  }
}
