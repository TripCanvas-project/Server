export function setupChatHandler(io, socket, rooms) {
    // 채팅 메시지 전송
    socket.on('chat-message', ({ roomId, message, userId, username }) => {
        const messageData = {
            id: Date.now(),
            userId,
            username,
            message,
            timestamp: new Date().toISOString()
        }

        // 룸의 모든 사용자에게 브로드캐스트 (본인 포함)
        io.to(roomId).emit('chat-message', messageData);
        console.log(`Chat message in room ${roomId} from ${username}: ${message}`);
    })

    // 타이핑 시작
    socket.on('typing-start', ({ roomId, username }) => {
        // 본인 제외하고 다른 사용자들에게만 전송
        socket.to(roomId).emit('user-typing', { username })
    });

    // 타이핑 종료
    socket.on('typing-stop', ({ roomId, username }) => {
        socket.to(roomId).emit('user-stopped-typing', { username })
    });
}