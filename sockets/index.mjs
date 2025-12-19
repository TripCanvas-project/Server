// Socket.IO 메인 설정 파일 (소켓 연결 관리)

import { setupChatHandler } from "./chatHandler.mjs";
import { setupVideoHandler } from "./videoHandler.mjs";
import { setupMemoHandler } from "./memoHandler.mjs";

// 전역 상태: 활성 룸과 사용자 관리
const rooms = new Map();
const userSockets = new Map();

// Socket.IO 서버 설정
// @param {SocketIO.Server} io - Socket.IO 서버 인스턴스
export function setupSocktIO(io) {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // 사용자 식별
    socket.on("identify", (userId) => {
      socket.userId = userId;
      // userSockets: 사용자 ID와 소켓 ID 매핑을 저장하는 맵
      userSockets.set(userId, socket.id);
      console.log(`User ${userId} identified with socket ${socket.id}`);
    });

    // 룸(Trip) 참가
    socket.on("join-room", ({ roomId, userId, username }) => {
      socket.join(roomId);
      socket.roomId = roomId;
      socket.userId = userId;
      socket.username = username;

      // 룸 초기화
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Map(),
          memos: [],
        });
      }

      const room = rooms.get(roomId);
      // 룸 내 사용자 목록에 추가
      room.users.set(socket.id, { userId, username, socketId: socket.id });

      // 다른 참가자들에게 알림
      socket.to(roomId).emit("user-joined", {
        userId,
        username,
        socketId: socket.id,
        // 룸 내 사용자 목록을 배열로 변환
        // Array.from(): 배열로 변환하는 메서드, values(): 맵의 값들을 배열로 변환하는 메서드
        users: Array.from(room.users.values()),
      });

      // 새로 참가한 사용자들에게 현재 룸 상태 전송
      socket.emit("room-state", {
        users: Array.from(room.users.values()),
        memos: room.memos,
      });

      console.log(`User ${username} joined room ${roomId}`);
    });

    // 각 기능별 핸들러 설정
    setupChatHandler(io, socket, rooms);
    setupVideoHandler(io, socket);
    setupMemoHandler(io, socket, rooms);

    // 룸 나가기
    socket.on("leave-room", () => {
      handle;
    });
  });
}

// 사용자 퇴장 처리
function handleUserLeave(io, socket, rooms) {
  if (!socket.roomId) return;

  const room = rooms.get(socket.roomId);
  if (room) {
    room.users.delete(socket.id);
  }
}
