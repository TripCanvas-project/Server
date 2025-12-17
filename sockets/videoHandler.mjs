// WebRTC 시그널링 이벤트 처리
// Offer/Answer/ICE Candidate 중계

export function setupVideoHandler(io, socket) {
    // WebRTC Offer 전달 (P2P 연결 시작)
    // to: 수신자 ID, offer: WebRTC Offer 데이터
    socket.on('webrtc-offer', ({ to, offer }) => {
        console.log(`Forwarding WebRTC offer from ${socket.id} to ${to}`);
        io.to(to).emit('webrtc-offer', {
            from: socket.id,
            fromUsername: socket.username,
            offer
        })
    })
    // WebRTC Answer 전달 (P2P 연결 응답)
    // to: 수신자 ID, answer: WebRTC Answer 데이터
    socket.on('webrtc-answer', ({ to, answer }) => {
        console.log(`Forwarding WebRTC answer from ${socket.id} to ${to}`);
        io.to(to).emit('webrtc-answer', {
            from: socket.id,
            answer
        })
    })
    // ICE Candidate(Interactive Connectivity Establishment) 전달 (네트워크 경로 찾기)
    // to: 수신자 ID, candidate: ICE Candidate 데이터
    // ICE Candidate는 WebRTC 피어가 자신에게 연결할 수 있는 유효한 네트워크 주소와 포트 조합이다.
    socket.on('webrtc-ice-candidate', ({ to, candidate }) => {
        console.log(`Forwarding ICE candidate from ${socket.id} to ${to}`);
        io.to(to).emit('webrtc-ice-candidate', {
            from: socket.id,
            candidate
        })        
    })
}