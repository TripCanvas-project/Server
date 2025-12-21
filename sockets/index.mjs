// Socket.IO 메인 설정 파일 (소켓 연결 관리)

import { setupChatHandler } from './chatHandler.mjs';
import { setupVideoHandler } from './videoHandler.mjs';
import { setupMemoHandler } from './memoHandler.mjs';

// 전역 상태: 활성 룸과 사용자 관리
const rooms = new Map();
const userSockets = new Map();

// Socket.IO 서버 설정
// @param {SocketIO.Server} io - Socket.IO 서버 인스턴스
export function setupSocktIO(io) {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);
        
        // 사용자 식별
        socket.on('identify', (userId) => {
            socket.userId = userId;
            // userSockets: 사용자 ID와 소켓 ID 매핑을 저장하는 맵
            userSockets.set(userId, socket.id)
            console.log(`User ${userId} identified with socket ${socket.id}`);
        })

        // 룸(Trip) 참가
        socket.on('join-room', ({ roomId, userId, username }) => {
            socket.join(roomId);
            socket.roomId = roomId;
            socket.userId = userId;
            socket.username = username;

            // 룸 초기화
            if(!rooms.has(roomId)) {
                rooms.set(roomId, {
                    users: new Map(),
                    memos: [],
                })
            }

            const room = rooms.get(roomId);
            // 룸 내 사용자 목록에 추가
            room.users.set(socket.id, { userId, username, socketId: socket.id })

            // 다른 참가자들에게 알림
            socket.to(roomId).emit('user-joined', {
                userId,
                username,
                socketId: socket.id,
                // 룸 내 사용자 목록을 배열로 변환
                // Array.from(): 배열로 변환하는 메서드, values(): 맵의 값들을 배열로 변환하는 메서드
                users: Array.from(room.users.values())
            });

            // 새로 참가한 사용자들에게 현재 룸 상태 전송
            socket.emit('room-state', {
                users: Array.from(room.users.values()),
                memos: room.memos
            });

            console.log(`User ${username} joined room ${roomId}`);
        })

        // 각 기능별 핸들러 설정
        setupChatHandler(io, socket, rooms);
        setupVideoHandler(io, socket);
        setupMemoHandler(io, socket, rooms);

        // 룸 나가기
        socket.on('leave-room', () => {
            handleUserLeave(io, socket, rooms);

            if (socket.userId) {
                userSockets.delete(socket.userId);
            }
        })
    })
}

// 사용자 퇴장 처리
function handleUserLeave(io, socket, rooms) {
    if (!socket.roomId) return;

    const room = rooms.get(socket.roomId);
    if (room) {
        // delete(): 맵에서 특정 키-값 쌍을 제거하는 메서드
        room.users.delete(socket.id);

        // 다른 참가자들에게 알림
        socket.to(socket.roomId).emit('user-left', {
            socketId: socket.id,
            username: socket.username,
            users: Array.from(room.users.values())
        })

        // 빈 룸 정리
        if (room.users.size === 0) {
            rooms.delete(socket.roomId)
            console.log(`Room ${socket.roomId} deleted (empty)`);
        } else {
            console.log(`User ${socket.username} left room ${socket.roomId} (${room.users.size} users remaining)`);            
        }
    }
    // leave(): 룸에서 사용자를 제거하는 메서드
    socket.leave(socket.roomId);
}

// 룸 통계 조회 (Health Check용)
export function getRoomStats() {
    return {
        totalRooms: rooms.size,
        // entries(): Map 객체 내의 모든 요소(키-값 쌍)를 순서대로 포함하는 새로운 이터레이터(Iterator) 객체를 반환한다.
        // map(): 배열의 각 요소에 대해 주어진 함수를 호출하고, 그 결과를 새로운 배열로 반환한다.
        totalUsers: Array.from(rooms.entries()).map(([roomId, room]) => ({
            roomId,
            userCount: room.users.size,
            memoCount: room.memos.length,
            users: Array.from(room.users.values()).map(u => u.username)
        }))
    }
}