import express from "express";
import { body } from "express-validator";
import { isAuth } from "../middleware/auth.mjs";
import * as tripController from "../controller/trip.mjs";

const router = express.Router();

router.get("/:status", tripController);

export default router;
