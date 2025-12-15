import express from "express";
import * as userController from "../controller/user.mjs";
import { body } from "express-validator";
import { validate } from "../middleware/validator.mjs";
import { isAuth } from "../middleware/auth.mjs";

const router = express.Router();

const validateLogin = [
    body("userid")
        .trim()
        .notEmpty()
        .withMessage("아이디를 입력해주세요")
        .isLength({ min: 4, max: 20 })
        .withMessage("아이디는 4~20자여야 합니다")
        .matches(/^[a-zA-Z0-9]+$/)
        .withMessage("아이디는 영문과 숫자만 사용 가능합니다"),

    body("password").trim().notEmpty().withMessage("비밀번호를 입력해주세요"),

    validate,
];

const validateSignup = [
    body("userid")
        .trim()
        .notEmpty()
        .withMessage("아이디를 입력해주세요")
        .isLength({ min: 4, max: 20 })
        .withMessage("아이디는 4~20자여야 합니다")
        .matches(/^[a-zA-Z0-9]+$/)
        .withMessage("아이디는 영문과 숫자만 사용 가능합니다"),

    body("password")
        .trim()
        .notEmpty()
        .withMessage("비밀번호를 입력해주세요")
        .isLength({ min: 8 })
        .withMessage("비밀번호는 8자 이상이어야 합니다"),

    body("nickname")
        .trim()
        .notEmpty()
        .withMessage("닉네임을 입력해주세요")
        .isLength({ min: 2, max: 10 })
        .withMessage("닉네임은 2~10자여야 합니다"),

    body("email")
        .trim()
        .notEmpty()
        .withMessage("이메일을 입력해주세요")
        .isEmail()
        .withMessage("올바른 이메일 형식이 아닙니다"),

    validate,
];

// 회원가입
router.post("/signup", validateSignup, userController.signup);

// 로그인
router.post("/login", validateLogin, userController.login);

// 로그인 유지 확인
router.post("/me", isAuth, userController.me);

export default router;
