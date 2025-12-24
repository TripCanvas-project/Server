import mongoose from 'mongoose';

const memoSchema = new mongoose.Schema({
    // 여행 ID (String으로 변경 - 클라이언트 호환)
    tripId: {
        type: String,
        required: true,
        index: true
    },
    
    // 메모 고유 ID (UUID)
    id: {
        type: String,
        required: true,
        unique: true
    },
    
    // 생성자 (String으로 변경 - 클라이언트 호환)
    createdBy: {
        type: String,
        required: true
    },
    
    // 메모 타입
    type: {
        type: String,
        enum: ['path', 'text', 'drawing', 'photo', 'pen', 'highlight', 'shape'],
        required: true
    },
    
    // 좌표 배열 (path, highlight용)
    coords: [{
        lat: Number,
        lng: Number
    }],
    
    // 텍스트 내용 (text용)
    text: {
        type: String,
        default: ''
    },
    
    // 스타일 정보
    style: {
        color: String,
        width: Number,
        opacity: Number,
        fontSize: Number
    },
    
    // 타임스탬프
    timestamp: {
        type: Number,
        default: Date.now
    },
    
    // ===== 기존 필드 유지 (하위 호환성) =====
    
    // 사용자 ID (ObjectId - 기존 호환)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // 레거시 content 필드
    content: {
        type: mongoose.Schema.Types.Mixed
    },
    
    // 단일 위치 (레거시)
    position: {
        lat: Number,
        lng: Number
    },
    
    // 캔버스 레이어 위치
    canvasPosition: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
    },
    
    // 연결된 장소
    placeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Place'
    },
    
    // 레이어 순서
    zIndex: {
        type: Number,
        default: 0
    },
    
    // 가시성
    isVisible: {
        type: Boolean,
        default: true
    },
    
    // 마지막 편집자
    lastEditedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    tags: [String]
}, {
    timestamps: true
});

// 인덱스
memoSchema.index({ tripId: 1, timestamp: -1 });
memoSchema.index({ tripId: 1, createdAt: -1 });

const Memo = mongoose.model('Memo', memoSchema);

export default Memo;