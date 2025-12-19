import * as tripRepository from "../dao/trip.mjs";
import * as userRepository from "../dao/user.mjs";

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

export async function getMyBucketlists(req, res) {
    try {
        console.log("요청 받음!");
        const userId = req.userId; // JWT 미들웨어에서 주입

        const user = await userRepository.findByIdWithBucketlists(userId);

        res.status(201).json({
            bucketlists: user.bucketlists,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "서버 에러" });
    }
}
