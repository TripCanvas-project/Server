import express from "express";
import path from "path";
import userRouter from "./router/user.mjs";
import connectDB from "./config/db.mjs";
// import { host } from "./config/host.js";
import "dotenv/config";
import cors from "cors";
import fs from "fs";
import { fileURLToPath } from "url";
import planRoutes from "./router/plan.mjs";
import routesRouter from "./router/route.mjs";
import tripRouter from "./router/trip.mjs";

const app = express();
app.use(express.json());

// ESM에서 __dirname 만들기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// client/public 경로
const clientPublic = path.join(__dirname, "../Client/public");
console.log("static:", clientPublic);
console.log("files:", fs.readdirSync(clientPublic));

// 루트 접속 시 로그인 페이지로 이동
app.get("/", (req, res) => {
  res.sendFile(path.join(clientPublic, "login.html"));
});

// 정적 파일 서빙 (HTML/CSS/JS)
app.use(express.static(clientPublic));

// app.use(
//   cors({
//     origin: "http://127.0.0.1:5500",
//     credentials: true,
//   })
// );

app.use(cors({ origin: true, credentials: true }));

// Router middleware
app.use("/user", userRouter);
app.use("/plan", planRoutes);
app.use("/route", routesRouter);
app.use("/trip", tripRouter);

app.use((req, res, next) => {
  res.sendStatus(404); // no page
});

connectDB()
  .then(() => {
    app.listen(process.env.HOST_PORT);
    console.log(`http://localhost:${process.env.HOST_PORT}/`);
    console.log("db connected!");
  })
  .catch(console.error());
