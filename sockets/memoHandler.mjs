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
        // push() 메서드는 배열의 끝에 새로운 요소를 추가하고, 새로운 길이를 반환한다.
        // 반환된 새로운 길이를 사용하여 새로운 메모의 ID를 설정할 수 있다.
        room.memos.push(newMemo);

        // 모든 참가자에게 브로드캐스트
        io.to(roomId).emit('memo-created', newMemo);
        console.log(`Memo createdin room ${roomId} by ${socket.username}}`);
    })

    // 메모 수정
    socket.on('memo-update', ({ roomId, memoId, updates }) => {
        const room = rooms.get(roomId);
        if (!room) {
            error(`Room ${roomId} not found`);
            return;
        }

        // findIndex() 메서드는 배열에서 주어진 요소를 찾을 수 있는 첫 번째 인덱스를 반환한다.
        // 찾을 수 없으면 -1을 반환한다.
        // findIndex() 메서드는 javascript의 Array.prototype.findIndex() 메서드와 동일하다.
        const memoIndex = room.memos.findIndex(m => m.id === memoId);
        if (memoIndex !== -1) {
            room.memos[memoIndex] = {
                ...room.memos[memoIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };

            // 모든 참가자에게 브로드캐스트
            io.to(roomId).emit('memo-updated', {
                memoId,
                memo: room.memos[memoIndex]
            })
            console.log(`Memo ${memoId} updated in room ${roomId}`);
        }
    })

    // 메모 삭제
    socket.on('memo-delete', ({ roomId, memoId }) => {
        const room = rooms.get(roomId);
        if (!room) {
            console.error(`Room ${roomId} not found`);
            return;
        }

        room.memos = room.memos.filter(m => m.id !== memoId);

        // 모든 참가자에게 브로드캐스트
        io.to(roomId).emit('memo-deleted', { memoId });
        console.log(`Memo ${memoId} deleted in room ${roomId}`);
    });
}