import express from "express";
import * as bucketController from "../controller/bucket.mjs";
import { isAuth } from "../middleware/auth.mjs";

const router = express.Router();
// 특정 user의 최근 추가한 bucketlist 4개 조회
router.get("/", isAuth, bucketController.getUserBuckets);

export default router;
