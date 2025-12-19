import express from "express";
import { isAuth } from "../middleware/auth.mjs";
import * as tripController from "../controller/trip.mjs";

const router = express.Router();

// trips 라우터
router.get("/", isAuth, tripController.getTripsForStatus);

router.get("/bucketlists", isAuth, tripController.getMyBucketlists);

export default router;
