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

export async function findTripHistoryByUserId(userId, limit = 10) {
    try {
        const trips = await Trip.find({ owner: userId })
            .select("_id title startDate endDate categories constraints")
            .sort({ endDate: -1 })
            .limit(limit)
            .lean();

        return trips.map((trip) => ({
            _id: trip._id,
            title: trip.title,
            startDate: trip.startDate,
            endDate: trip.endDate,
            dateRange: `${formatDate(trip.startDate)} - ${formatDate(
                trip.endDate
            )}`,
            totalBudget: trip.constraints?.budget?.total || 0,
            budgetDisplay: `₩${(
                trip.constraints?.budget?.total || 0
            ).toLocaleString("ko-KR")}`,
            category: trip.categories?.[0] || "etc",
            placesDisplay: `${trip.places?.length || 0}개 장소`,
        }));
    } catch (error) {
        console.error("findTripHistoryByUserId Error:", error);
        throw error;
    }
}

function formatDate(date) {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
}

function getCategoryIcon(category) {
    const iconMap = {
        카페: "☕",
        맛집: "🍽️",
        "역사/문화": "🏛️",
        자연: "🌲",
        쇼핑: "🛍️",
        캠핑: "⛺",
    };
    return iconMap[category] || "🏖️";
}
