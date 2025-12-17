import Schedule from "../models/Schedule.js";

// 일정 생성
export async function createSchedule(scheduleData) {
  const schedule = new Schedule(scheduleData);
  return await schedule.save();
}

// 특정 사용자의 특정 여행 일정 조회 (본인 것만)
export async function getMySchedules(userId, tripId) {
  return await Schedule.find({ userId, tripId }).sort({ time: 1 });
}

// 일정 수정
export async function updateSchedule(scheduleId, userId, updateData) {
  return await Schedule.findOneAndUpdate(
    { _id: scheduleId, userId }, // 본인 일정만 수정 가능
    updateData,
    { new: true }
  );
}

// 일정 삭제
export async function deleteSchedule(scheduleId, userId) {
  return await Schedule.findOneAndDelete({ _id: scheduleId, userId });
}
