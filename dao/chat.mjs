import ChatMessage from "../models/ChatMessage.mjs";

// 채팅 메시지 생성
export async function createMessage(messageData) {
  const message = new ChatMessage(messageData);
  return message.save();
}

// 특정 여행의 채팅 기록 조회
export async function findByTripId(tripId, limit = 100) {
  return ChatMessage.find({ tripId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
}

// 메시지 ID로 조회
export async function findById(id) {
  return ChatMessage.findById(id);
}

// 메시지 삭제
export async function deleteById(id) {
  return ChatMessage.findByIdAndDelete(id);
}

// 특정 여행의 채팅 전체 삭제
export async function deleteByTripId(tripId) {
  return ChatMessage.deleteMany({ tripId });
}
