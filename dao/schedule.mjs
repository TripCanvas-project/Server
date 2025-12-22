import Schedule from "../models/Schedule.js";

// 일정 생성
export async function createSchedule(scheduleData) {
  console.log(`📅 [DAO] 일정 생성 - tripId: ${scheduleData.tripId}, title: ${scheduleData.title}`);
  const schedule = new Schedule(scheduleData);
  const saved = await schedule.save();
  console.log(`   ✅ 일정 저장 완료 - _id: ${saved._id}`);
  return saved;
}

// 특정 사용자의 특정 여행 일정 조회 (본인 것만)
export async function getMySchedules(userId, tripId) {
  console.log(`📅 [DAO] 일정 조회 - userId: ${userId}, tripId: ${tripId}`);
  const schedules = await Schedule.find({ userId, tripId }).sort({ time: 1 });
  console.log(`   ✅ ${schedules.length}개의 일정 항목 조회됨`);
  return schedules;
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
