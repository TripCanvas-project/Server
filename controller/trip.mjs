import * as tripRepository from "../dao/trip.mjs";

export async function getTripsForStatus(req, res) {
    const { status } = req.params;
    const userId = req.userId;
}
