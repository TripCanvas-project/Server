import * as memoRepository from '../dao/memo.mjs';

// 메모 생성
export const createMemo = async (req, res) => {
    try {
       const { tripId, id, type, coords, text, style, createdBy, timestamp } = req.body;
       
       if (!tripId || !id || !type || !createdBy) {
            return res.status(400).json({
                error: 'Missing required fields: tripId, id, type, createdBy'
            })
       }

       const memo = await memoRepository.createMemo({
        tripId,
        id,
        type,
        coords,
        text,
        style,
        createdBy,
        timestamp: timestamp || Date.now()
       })

       return res.status(201).json(memo);
    } catch (error) {
        console.error('Error creating memo:', error);
        return res.status(500).json({ error: 'Failed to create memo' });
    }
}

// 특정 여행의 메모 목록 조회
export const getByTripId = async (req, res) => {
    try {
        const { tripId } = req.params;

        const memos = await memoRepository.findByTripId(tripId);

        return res.json(memos);
    } catch (error) {
        console.error('Error fetching memos:', error);
        return res.status(500).json({ error: 'Failed to fetch memos' });
    }
};

// 메모 삭제
export const deleteById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await memoRepository.deleteById(id);

        if (!result) {
            return res.status(404).json({ error: 'Memo not found' });
        }

        return res.json({ message: 'Memo deleted successfully', id })
    } catch (error) {
        console.error('Error deleting memo:', error);
        return res.status(500).json({ error: 'Failed to delete memo' });
    }
}

// 특정 여행의 메모 전체 삭제
export const deleteByTripId = async (req, res) => {
    try {
        const { tripId } = req.params;

        const result = await memoRepository.deleteByTripId(tripId);

        return res.json({
            message: 'All memos deleted successfully',
            tripId,
            deletedCount: result.deletedCount
        })
    } catch (error) {
        console.error('Error deleting memos:', error);
        return res.status(500).json({ error: 'Failed to delete all memos' });
    }
}

// 메모 수정
export const updateMemo = async (req, res) => {
    try {
        const { id } = req.params;
        const memo = req.body;

        const result = await memoRepository.updateMemo(id, memo);

        if (!result) {
            return res.status(404).json({ error: 'Memo not found' });
        }

        return res.json({ message: 'Memo updated successfully', id, memo });
    } catch (error) {
        console.error('Error updating memo:', error);
        return res.status(500).json({ error: 'Failed to update memo' });
    }
}