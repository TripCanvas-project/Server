import Trip from "../models/Trip.mjs";
import mongoose from "mongoose";

export async function findTripsByUserId(userId) {
    const objectId = new mongoose.Types.ObjectId(userId);

    return await Trip.find({
        $or: [{ owner: objectId }, { "collaborators.userId": objectId }],
    })
        .sort({ createdAt: -1 })
        .populate("owner", "nickname email")
        .populate("collaborators.userId", "nickname email")
        .lean();
}

export async function findTripsByUserIdAndStatus(userId, status) {
    const objectId = new mongoose.Types.ObjectId(userId);

    return await Trip.find({
        status,
        $or: [{ owner: objectId }, { "collaborators.userId": objectId }],
    }).lean();
}

// 어떤 user에 대한 trip counts select
export async function countTripsByUserId(userId) {
    const objectId = new mongoose.Types.ObjectId(userId);

    return await Trip.aggregate([
        {
            $match: {
                $or: [
                    { owner: objectId },
                    { "collaborators.userId": objectId },
                ],
            },
        },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
    ]);
}
