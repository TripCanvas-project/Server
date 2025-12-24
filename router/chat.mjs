import express from 'express';
import * as chatController from '../controller/chat.mjs';

const router = express.Router();

// 채팅 메시지 저장
router.post('/', chatController.createMessage);

// 특정 여행의 채팅 기록 조회
router.get('/:tripId', chatController.getByTripId);

// 채팅 메시지 삭제
router.delete('/:id', chatController.deleteById);

// 특정 여행의 채팅 전체 삭제
router.delete('/:tripId', chatController.deleteByTripId);

export default router;