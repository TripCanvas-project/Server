import multer from "multer";
import path from "path";

// 저장 위치 + 파일명 규칙
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/profiles");
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `user-${req.user.id}-${Date.now()}${ext}`;
        cb(null, filename);
    },
});

// 이미지 파일만 허용
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("이미지 파일만 업로드 가능합니다"), false);
    }
};

const uploadProfile = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export default uploadProfile;
