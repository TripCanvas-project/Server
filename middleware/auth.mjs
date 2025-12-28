import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt.js";

export const isAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "토큰이 없습니다" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // req.userId = decoded.id;
    req.user = { id: decoded.id };
    req.userId = decoded.id;

    if (!req.user.id) {
      return res.status(401).json({ message: "토큰에 사용자 정보가 없습니다" });
    }

    if (!req.userId) {
      return res.status(401).json({ message: "토큰에 사용자 정보가 없습니다" });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "유효하지 않은 토큰입니다" });
  }
};
