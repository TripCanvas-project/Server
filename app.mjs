import express from "express";
import path from "path";
import userRouter from "./router/user.mjs";
import connectDB from "./config/db.mjs";
// import { host } from "./config/host.js";
import "dotenv/config";
import cors from "cors";
import fs from "fs";
import { Server } from "http";
import { fileURLToPath } from "url";
import planRoutes from "./router/plan.mjs";
import routesRouter from "./router/route.mjs";
import { setupSocktIO, getRoomStats } from "./sockets/index.mjs";

const app = express();
const server = createServer(app);

// 미들웨어
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io 설정
const io = new Server(server);

// Socket 핸들러 설정
setupSocktIO(io);

// Heath check
app.get("/health", (req, res) => {
  const stats = getRoomStats();
  res.json({
    status: "ok",
    // engine: Socket.io 엔진 객체, clientsCount: 현재 연결된 클라이언트 수
    connections: io.engine.clientsCount,
    ...stats
  })
})


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

// Router middleware
app.use("/user", userRouter);
app.use("/plan", planRoutes);
app.use("/route", routesRouter);

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