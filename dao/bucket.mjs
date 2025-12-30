import Bucketlist from "../models/Bucket.js";

export const getBucketsByUserId = async (userId) => {
  return await Bucketlist.find({ userId }).sort({ createdAt: -1 }).exec();
};
