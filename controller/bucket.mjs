import * as bucketRepository from "../dao/bucket.mjs";
import Bucketlist from "../models/Bucket.js";

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
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ message: "항목 내용을 입력해주세요." });
    }

    const bucket = await Bucketlist.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!bucket) {
      return res
        .status(404)
        .json({ message: "버킷리스트를 찾을 수 없습니다." });
    }

    bucket.items = Array.isArray(bucket.items) ? bucket.items : [];
    bucket.items.push({ text, done: false });

    // 타겟 카운트가 설정되지 않았다면 아이템 수를 기본값으로 사용
    bucket.targetCount =
      bucket.targetCount && Number(bucket.targetCount) > 0
        ? bucket.targetCount
        : bucket.items.length;

    bucket.completedCount = bucket.items.filter((item) => item.done).length;
    bucket.status =
      bucket.completedCount >= bucket.targetCount ? "completed" : "active";

    await bucket.save();
    res.status(200).json({ bucket: formatBucket(bucket) });
  } catch (error) {
    console.error("Error adding bucket item:", error);
    res.status(500).json({ message: "아이템을 추가하지 못했습니다." });
  }
};

export const updateBucketItem = async (req, res) => {
  try {
    const { done } = req.body;
    const bucket = await Bucketlist.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!bucket) {
      return res
        .status(404)
        .json({ message: "버킷리스트를 찾을 수 없습니다." });
    }

    const item = (bucket.items || []).find(
      (it) => String(it._id) === String(req.params.itemId)
    );

    if (!item) {
      return res.status(404).json({ message: "항목을 찾을 수 없습니다." });
    }

    item.done = Boolean(done);
    bucket.completedCount = bucket.items.filter((it) => it.done).length;
    bucket.targetCount =
      bucket.targetCount && Number(bucket.targetCount) > 0
        ? bucket.targetCount
        : bucket.items.length;
    bucket.status =
      bucket.completedCount >= bucket.targetCount ? "completed" : "active";

    await bucket.save();
    res.status(200).json({ bucket: formatBucket(bucket) });
  } catch (error) {
    console.error("Error updating bucket item:", error);
    res.status(500).json({ message: "항목을 수정하지 못했습니다." });
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
