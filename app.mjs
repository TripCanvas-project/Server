import express from "express";
import path from "path";
import userRouter from "./router/user.mjs";
import connectDB from "./config/db.mjs";
import { host } from "./config/host.js";

const app = express();

app.use(express.json());

import cors from "cors";

app.use(
    cors({
        origin: "http://127.0.0.1:5500",
        credentials: true,
    })
);

// Router middleware
app.use("/user", userRouter);

app.use((req, res, next) => {
    res.sendStatus(404); // no page
});

connectDB()
    .then(() => {
        app.listen(host.port);
        console.log("db connected!");
    })
    .catch(console.error());
