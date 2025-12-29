import dotenv from "dotenv";
dotenv.config();

export const HOST_URL = process.env.HOST_URL || "http://localhost:8080";
