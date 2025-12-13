const memoSchema = new mongoose.Schema({
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true,
        index: true
    },
    
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    type: {
        type: String,
        enum: ['text', 'drawing', 'photo', 'pen', 'highlight', 'shape'],
        required: true
    },
    
    // 메모 내용
    content: {
        // type === 'text': { text: string, fontSize: number, color: string }
        // type === 'drawing': { paths: [...], color: string, width: number }
        // type === 'photo': { url: string, width: number, height: number }
        // type === 'pen': { points: [...], color: string, width: number }
        // type === 'highlight': { area: [...], color: string, opacity: number }
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    
    // 지도 상의 위치
    position: {
        lat: {type: Number, required: true},
        lng: {type: Number, required: true}
    },
    
    // 캔버스 레이어 위치 (픽셀 좌표)
    canvasPosition: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
    },
    
    // 연결된 장소 (선택사항)
    placeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Place'
    },
    
    // 레이어 순서 (z-index)
    zIndex: {
        type: Number,
        default: 0
    },
    
    // 가시성
    isVisible: {
        type: Boolean,
        default: true
    },
    
    // 협업 정보
    lastEditedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    tags: [String]
}, {
    timestamps: true
});

// 특정 여행의 메모를 빠르게 조회하기 위한 인덱스
memoSchema.index({ tripId: 1, createdAt: -1 });