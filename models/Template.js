import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, '템플릿 이름은 100자 이하여야 합니다']
    },
    
    description: {
        type: String,
        required: true,
        maxlength: [500, '설명은 500자 이하여야 합니다']
    },
    
    // 아이콘 & 배경색 추가
    icon: {
        type: String,
        required: true,
        default: '🎨'
    },
    
    bgColor: {
        type: String,
        default: '#3b82f6',
        match: [/^#[0-9A-Fa-f]{6}$/, '올바른 색상 코드가 아닙니다']
    },
    
    category: {
        type: String,
        enum: ['cafe', 'food', 'history', 'nature', 'culture', 'camping'],
        required: true
    },
    
    // 서브 카테고리 추가 (복수 선택 가능)
    subCategories: [{
        type: String,
        enum: ['family', 'couple', 'solo', 'friends', 'photo', 'healing', 'adventure', 'budget']
    }],
    
    thumbnail: {
        type: String,
    },
    
    // 기간 정보 개선
    duration: {
        days: {
            type: Number,
            required: true,
            min: 0  // 0 = 당일치기
        },
        nights: {
            type: Number,
            required: true,
            min: 0
        },
        displayText: {
            type: String,
            default: function() {
                if (this.duration.days === 0 || this.duration.nights === 0) {
                    return '당일치기';
                }
                return `${this.duration.nights}박 ${this.duration.days}일`;
            }
        }
    },
    
    // 예상 총 비용 추가
    estimatedCost: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // 템플릿에 포함된 장소들
    places: [{
        name: String,
        category: String,
        description: String,
        estimatedCost: Number,
        estimatedTime: Number,
        tags: [String]
    }],
    
    // 템플릿 구조(Gemini API responseSchema로 변환)
    schema: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    
    tags: [String],
    
    isOfficial: {
        type: Boolean,
        default: false,
    },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    
    badge: {
        type: String,
        enum: ['popular', 'new', null],
        default: null,
    },
    
    // 통계 개선
    stats: {
        useCount: { type: Number, default: 0 },
        likeCount: { type: Number, default: 0 },
        rating: { type: Number, default: 0, min: 0, max: 5 },
        reviewCount: { type: Number, default: 0 }
    },
    
    // 활성화 상태
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual: 평균 평점 텍스트
templateSchema.virtual('ratingText').get(function() {
    if (this.stats.reviewCount === 0) return '평가 없음';
    return `⭐ ${this.stats.rating.toFixed(1)}`;
});

// 인덱스
templateSchema.index({ category: 1 });
templateSchema.index({ 'stats.useCount': -1 });
templateSchema.index({ 'stats.rating': -1 });
templateSchema.index({ badge: 1 });
templateSchema.index({ isActive: 1 });

export default mongoose.model('Template', templateSchema);