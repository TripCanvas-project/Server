import * as bucketRepository from "../dao/bucket.mjs";

export const getUserBuckets = async (req, res) => {
    try {
        const userId = req.user.id; // Assuming user ID is available in req.user
        const buckets = await bucketRepository.getBucketsByUserId(userId);

        res.status(200).json(buckets);
    } catch (error) {
        console.error("Error fetching user buckets:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
