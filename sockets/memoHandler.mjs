export function setupMemoHandler(io, socket, rooms) {
    socket.on('memo-create', ({roomId, memo}) => {
        const room = rooms.get(roomId);
        if (!room) {
            console.error(`Room ${roomId} not found`);
            return;
        }

        const newMemo = {
            ...memo,
            id: Date.now(),
            createdBy: socket.username,
            createdAt: new Date().toISOString()
        };

        // 메모리에 저장 (필요시 DB 저장 추가)
        room.memos.push(newMemo);

        // 모든 참자가자에게 브로드캐스트
        is.to(roomId).emit('memo-created', newMemo);
        console.log(`Memo createdin room ${roomId} by ${socket.username}}`);
    })

    // 메모 수정
    socket.on('memo-update', ({ roomId, memoId, updates }) => {
        const room = rooms.get(roomId);
        if (!room) {
            error(`Room ${roomId} not found`);
            return;
        }

        const memoIndex = room.memos.findIndex(m => m.id === memoId);
        if (memoIndex !== -1) {
            room.memos[memoIndex] = {
                ...room.memos[memoIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            }
        }
    })
}