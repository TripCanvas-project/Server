import * as userRepository from "../dao/user.mjs";
import { JWT_SECRET } from "../config/jwt.js";

const AUTH_ERROR = { message: "인증 에러" };

export const isAuth = async (req, res, next) => {
    const authHeader = req.get("Authorization");
    console.log(authHeader);

    if (!(authHeader && authHeader.startsWith("Bearer "))) {
        // 인증 실패
        console.log("Header Error");
        return res.status(401).json(AUTH_ERROR);
    }

    // 인증 성공
    const token = authHeader.split(" ")[1];
    console.log("토큰 분리 성공:", token);

    jwt.verify(token, JWT_SECRET, async (error, decoded) => {
        if (error) {
            console.log(error);
            return res.status(401).json(AUTH_ERROR);
        }
        console.log(decoded);
        const user = await authRepository.findById(decoded.id);

        if (!user) {
            console.log("아이디 없음");
            return res.status(401).json(AUTH_ERROR);
        }
        console.log("user id:", user.id);
        console.log("user.userid:", user.userid);
        req.id = user.id;

        next();
    });
};
