import * as chatRepository from '../dao/chat.mjs';

// 채팅 메시지 저장
export const createMessage = async (req, res) => {
    try {
        const { tripId, username, message, timestamp } = req.body;

        if (!tripId || !username || !message) {
            return res.status(400).json({
                error: 'Missing required fields: tripId, username, message'
            });
        }

        const chatMessage = await chatRepository.createMessage({
            tripId,
            username,
            message,
            timestamp: timestamp || Date.now()
        })

        return res.status(201).json(chatMessage)
    } catch (error) {
        console.error('Error saving chat message:', error);
        return res.status(500).json({ error: 'Failed to save chat message' });     
    }
}

// 특정 여행의 채팅 기록 조회
export const getByTripId = async (req, res) => {
    try {
        const { tripId } = req.params;
        const { limit } = req.query;

        const messages = await chatRepository.findByTripId(
            tripId,
            limit ? parseInt(limit) : 100
        );

        return res.json(messages);
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        return res.status(500).json({ error: 'Failed to fetch chat messages' });
    }
}

export const deleteById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await chatRepository.deleteById(id);

        if (!result) {
            return res.status(404).json({ error: 'Chat message not found' });
        }

        return res.json({ message: 'Chat message deleted successfully', id });
    } catch (error) {
        console.error('Error deleting chat message:', error);
        return res.status(500).json({ error: 'Failed to delete chat message' });
    }
}

// 특정 여행의 채팅 전체 삭제
export const deleteByTripId = async (req, res) => {
    try {
        const { tripId } = req.params;

        const result = await chatRepository.deleteByTripId(tripId);

        return res.json({
            message: 'All chat messages deleted successfully',
            tripId,
            deletedCount: result.deletedCount
        })
    } catch (error) {
        console.error('Error deleting chat messages:', error);
        return res.status(500).json({ error: 'Failed to delete all chat messages' });
    }
}