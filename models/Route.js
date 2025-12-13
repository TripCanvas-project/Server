const routeSchema = new mongoose.Schema({
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true,
        index: true
    },
    
    name: {
        type: String,
        default: 'Default Route'
    },
    
    version: {
        type: Number,
        default: 1
    },
    
    type: {  // 오타 수정: tye → type
        type: String,
        enum: ['original', 'optimized', 'alternative', 'user-modified'],
        default: 'original'
    },
    
    // 경로에 포함된 장소들 (순서 중요!)
    waypoints: [{
        order: {  // 방문 순서
            type: Number,
            required: true
        },
        placeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Place'
        },
        placeName: String,
        coordinates: {
            lat: Number,
            lng: Number
        },
        // 일정 정보
        scheduledDate: Date,  // 방문 예정일
        scheduledTime: String,  // 방문 예정 시각
        estimatedDuration: Number,  // 예상 체류 시간 (분)
        
        // 메모 (각 장소별 간단 메모)
        note: String,
        
        // 이동 정보 (이전 장소에서 현재 장소로)
        travelInfo: {
            distance: Number,  // 거리 (km)
            duration: Number,  // 소요 시간 (분)
            mode: {
                type: String,
                enum: ['driving', 'transit', 'walking', 'bicycling']
            }
        }
    }],
    
    // 전체 경로 통계
    totalDistance: Number,  // 총 거리 (km)
    totalDuration: Number,  // 총 소요 시간 (분)
    totalCost: Number,      // 예상 총 비용
    
    // 경로 생성 방식
    generatedBy: {
        type: String,
        enum: ['user', 'gemini-ai', 'optimization'],
        default: 'user'
    },
    
    // 활성화 상태
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});