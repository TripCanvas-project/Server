import Bucketlist from "../models/Bucket.js";

// dashboard 렌더링용 특정 user의 최근 추가한 bucketlist 4개 조회
export const getBucketsByUserId = async (userId) => {
    return await Bucketlist.find({ userId, status: "active" }).limit(4).exec();
};
