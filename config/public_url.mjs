import dotenv from "dotenv";
dotenv.config();

export const PUBLIC_BASE_URL =
    process.env.PUBLIC_BASE_URL || "http://localhost:8080";
