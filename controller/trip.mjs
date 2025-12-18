import * as tripRepository from "../dao/trip.mjs";

export async function getTripsForStatus(req, res) {
    const { status } = req.query;
    const userId = req.userId;

    try {
        const trips = status
            ? await tripRepository.findTripsByUserIdAndStatus(userId, status)
            : await tripRepository.findTripsByUserId(userId);

        return res.status(200).json(trips);
    } catch (error) {
        console.error("getTripsForStatus 에러:", error);
        return res.status(500).json({ message: "서버 오류" });
    }
}
