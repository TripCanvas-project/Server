import Memo from "../models/Memo.mjs";

// 메모 생성
export async function createMemo(memoData) {
    const memo = new Memo(memoData);
    return memo.save();
}

// 특정 여행의 메모 목록 조회
export async function findByTripId(tripId) {
    return Memo.find({ tripId })
        .sort({ timestamp: 1 })
        // 기본적으로 Mongoose 쿼리는 'Mongoose Document' 객체를 반환한다. 
        // 이 객체는 .save(), .get() 같은 특수한 기능들을 포함하고 있어 무겁다.
        // .lean() 메서드를 사용하면 '일반 JavaScript 객체'로 변환된다.
        // 결과 데이터를 수정할 필요 없이 읽기 전용으로 사용할 때 매우 권장되는 방식이다.
        .lean();
}

// 메모 ID로 조회
export async function findById(id) {
    return Memo.findOne({ id });
}

// 메모 삭제
export async function deleteById(id) {
    return Memo.findOneAndDelete({ id });
}

// 특정 여행의 메모 전체 삭제
export async function deleteByTripId(tripId) {
    return Memo.deleteMany({ tripId });
}