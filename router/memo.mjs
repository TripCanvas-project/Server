import express from 'express';
import * as memoController from '../controller/memo.mjs';

const router = express.Router();

// 메모 생성
router.post('/', memoController.createMemo);

router.put('/:id', memoController.updateMemo);

// 특정 여행의 메모 목록 조회
router.get('/:tripId', memoController.getByTripId);

// 메모 삭제
router.delete('/:id', memoController.deleteById);

// 특정 여행의 메모 전체 삭제
router.delete('/:tripId', memoController.deleteByTripId);

export default router;