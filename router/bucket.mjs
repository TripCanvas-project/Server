import express from "express";
import * as bucketController from "../controller/bucket.mjs";
import { isAuth } from "../middleware/auth.mjs";

const router = express.Router();

// 인증 미들웨어 공통 적용
router.use(isAuth);

// 버킷리스트 CRUD + 아이템 토글
router.get("/", bucketController.getUserBuckets);
router.post("/", bucketController.createBucket);
router.get("/:id", bucketController.getBucketById);
router.post("/:id/items", bucketController.addItemToBucket);
router.patch("/:id/items/:itemId", bucketController.updateBucketItem);
router.delete("/:id", bucketController.deleteBucket);
router.delete("/:id/items/:itemId", bucketController.deleteBucketItem);

export default router;
