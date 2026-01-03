import * as bucketRepository from "../dao/bucket.mjs";
import Bucketlist from "../models/Bucket.js";
import mongoose from "mongoose";

// 프론트 사용 형태에 맞춰 공통 포맷으로 정리
const formatBucket = (bucketDoc) => {
  if (!bucketDoc) return null;

  const items = Array.isArray(bucketDoc.items) ? bucketDoc.items : [];
  const targetCount = Number(
    bucketDoc.targetCount ?? bucketDoc.target ?? items.length ?? 0
  );
  const completedCount = Number(
    bucketDoc.completedCount ??
      bucketDoc.current ??
      items.filter((item) => item.done).length
  );
  const normalizedStatus =
    bucketDoc.status === "completed"
      ? "completed"
      : completedCount > 0 && completedCount >= targetCount
      ? "completed"
      : "in-progress";

  return {
    _id: bucketDoc._id,
    title: bucketDoc.title || bucketDoc.name || "",
    description: bucketDoc.description || "",
    theme: bucketDoc.theme || bucketDoc.icon || "",
    items,
    targetCount,
    completedCount,
    status: normalizedStatus,
    createdAt: bucketDoc.createdAt,
    updatedAt: bucketDoc.updatedAt,
  };
};

export const getUserBuckets = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Fetching buckets for user:", userId);
    const buckets = await bucketRepository.getBucketsByUserId(userId);

    res.status(200).json({ bucketlists: buckets.map(formatBucket) });
  } catch (error) {
    console.error("Error fetching user buckets:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createBucket = async (req, res) => {
  try {
    const { title, description = "", theme = "", items = [] } = req.body;
    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const cleanTheme = typeof theme === "string" ? theme.trim() : "";

    if (!cleanTitle) {
      return res.status(400).json({ message: "제목을 입력해주세요." });
    }

    const normalizedItems = Array.isArray(items)
      ? items.map((item) => ({
          text: (item?.text ?? "").trim(),
          done: Boolean(item?.done),
        }))
      : [];

    const targetCount = normalizedItems.length;
    const completedCount = normalizedItems.filter((item) => item.done).length;
    const status =
      targetCount > 0 && completedCount >= targetCount ? "completed" : "active";

    const bucket = await Bucketlist.create({
      userId: req.user.id,
      title: cleanTitle,
      name: cleanTitle, // 기존 필드와 호환
      description,
      theme: cleanTheme,
      icon: cleanTheme,
      items: normalizedItems,
      targetCount,
      completedCount,
      status,
    });

    res.status(201).json({ bucket: formatBucket(bucket) });
  } catch (error) {
    console.error("Error creating bucket:", error);
    res.status(500).json({ message: "버킷리스트를 생성하지 못했습니다." });
  }
};

export const getBucketById = async (req, res) => {
  try {
    const bucket = await Bucketlist.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!bucket) {
      return res
        .status(404)
        .json({ message: "버킷리스트를 찾을 수 없습니다." });
    }

    res.status(200).json({ bucket: formatBucket(bucket) });
  } catch (error) {
    console.error("Error fetching bucket:", error);
    res.status(500).json({ message: "버킷리스트 조회에 실패했습니다." });
  }
};

export const addItemToBucket = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      await session.abortTransaction();
      return res.status(400).json({ message: "항목 내용을 입력해주세요." });
    }

    // 1) 아이템 push + targetCount +1
    const bucket = await Bucketlist.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        $push: { items: { text: text.trim(), done: false } },
        $inc: { targetCount: 1 },
      },
      { new: true, session }
    );

    if (!bucket) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ message: "버킷리스트를 찾을 수 없습니다." });
    }

    // 2) status 갱신 (completedCount/targetCount 기준)
    const nextStatus =
      (bucket.targetCount || 0) > 0 &&
      (bucket.completedCount || 0) >= (bucket.targetCount || 0)
        ? "completed"
        : "active";

    if (bucket.status !== nextStatus) {
      bucket.status = nextStatus;
      await bucket.save({ session });
    }

    await session.commitTransaction();
    return res.status(200).json({ bucket: formatBucket(bucket) });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error adding bucket item:", error);
    return res.status(500).json({ message: "아이템을 추가하지 못했습니다." });
  } finally {
    session.endSession();
  }
};

export const updateBucketItem = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { done } = req.body;
    if (typeof done !== "boolean") {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "done 값은 boolean이어야 합니다." });
    }

    // 1) 먼저 현재 item.done 값 확인 (변화량 계산용)
    const bucket = await Bucketlist.findOne(
      {
        _id: req.params.id,
        userId: req.user.id,
        "items._id": req.params.itemId,
      },
      { "items.$": 1, completedCount: 1, targetCount: 1, status: 1 } // 필요한 필드만
    ).session(session);

    if (!bucket) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ message: "버킷리스트/항목을 찾을 수 없습니다." });
    }

    const item = bucket.items?.[0];
    if (!item) {
      await session.abortTransaction();
      return res.status(404).json({ message: "항목을 찾을 수 없습니다." });
    }

    const prev = Boolean(item.done);
    const next = Boolean(done);

    // 변화 없으면 done만 set하고 종료해도 되지만, 일관성 있게 아래 update로 통일
    let incCompleted = 0;
    if (prev !== next) incCompleted = next ? 1 : -1;

    // 2) done 업데이트 + completedCount 증감(필요시)
    const updated = await Bucketlist.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id,
        "items._id": req.params.itemId,
      },
      {
        $set: { "items.$.done": next },
        ...(incCompleted !== 0
          ? { $inc: { completedCount: incCompleted } }
          : {}),
      },
      { new: true, session }
    );

    // 안전장치: completedCount 음수 방지(이론상 거의 안 나와야 함)
    if (updated.completedCount < 0) updated.completedCount = 0;

    // 3) status 갱신
    const nextStatus =
      (updated.targetCount || 0) > 0 &&
      (updated.completedCount || 0) >= (updated.targetCount || 0)
        ? "completed"
        : "active";

    if (updated.status !== nextStatus) {
      updated.status = nextStatus;
      await updated.save({ session });
    }

    await session.commitTransaction();
    return res.status(200).json({ bucket: formatBucket(updated) });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error updating bucket item:", error);
    return res.status(500).json({ message: "항목을 수정하지 못했습니다." });
  } finally {
    session.endSession();
  }
};

export const deleteBucketItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;

    const bucket = await Bucketlist.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!bucket) {
      return res
        .status(404)
        .json({ message: "버킷리스트를 찾을 수 없습니다." });
    }

    // 삭제 전 길이
    const beforeLen = (bucket.items || []).length;

    // items에서 해당 item 제거
    bucket.items = (bucket.items || []).filter(
      (it) => String(it._id) !== String(itemId)
    );

    // 실제로 삭제된 게 없으면 404
    if (bucket.items.length === beforeLen) {
      return res.status(404).json({ message: "항목을 찾을 수 없습니다." });
    }

    // ✅ 카운트/상태 재계산(현재 너 코드 스타일과 동일)
    bucket.targetCount = bucket.items.length;
    bucket.completedCount = bucket.items.filter((it) => it.done).length;
    bucket.status =
      bucket.targetCount > 0 && bucket.completedCount >= bucket.targetCount
        ? "completed"
        : "active";

    await bucket.save();
    return res.status(200).json({ bucket: formatBucket(bucket) });
  } catch (error) {
    console.error("Error deleting bucket item:", error);
    return res.status(500).json({ message: "항목을 삭제하지 못했습니다." });
  }
};

export const deleteBucket = async (req, res) => {
  try {
    const deleted = await Bucketlist.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deleted) {
      return res
        .status(404)
        .json({ message: "버킷리스트를 찾을 수 없습니다." });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting bucket:", error);
    res.status(500).json({ message: "버킷리스트를 삭제하지 못했습니다." });
  }
};
