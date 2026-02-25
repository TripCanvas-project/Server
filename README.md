## TripCanvas Server

AI 기반 여행 플래너 **TripCanvas**의 백엔드입니다.  
사용자·여행·경로·메모·채팅·버킷리스트·일정·예산을 관리하는 REST API와, Socket.IO 기반의 실시간 협업(채팅·메모·화상)을 제공합니다.  
또한 Python + Google Gemini를 이용해 여행 경로를 자동으로 생성합니다.

![](./upload/Screenshot%202026-02-25%20at%204.56.32 PM.png)

### 주요 기능

- **인증/사용자 관리**
  - 회원가입, 로그인, 로그인 유지 확인(`/user/signup`, `/user/login`, `/user/me`)
  - JWT 기반 인증 (`Authorization: Bearer <token>`)
  - 프로필 정보 및 프로필 이미지 업로드 (multer + `/user/profile`)

- **여행(Trip) 관리**
  - 내 여행 목록, 여행 상태(예: planning/active 등) 관리
  - 여행 생성/수정/삭제 (`/trip` 라우트)
  - 초대 링크 생성 및 링크를 통한 여행 참여 (협업 기능)

- **AI 경로 생성**
  - `/plan/generate`로 사용자의 입력(출발지, 도착지, 기간 등)과 함께 Python 스크립트 [`controller/TripPlan.py`](controller/TripPlan.py)를 실행
  - Google Gemini API를 통해 여행 일정 및 방문 장소 목록 생성
  - 결과를 MongoDB의 `Trip`, `Route`, `Place` 컬렉션에 저장

- **경로/장소 관리**
  - 최신 경로 조회, 특정 여행에 대한 경로 조회, Directions 계산 (`/route` 라우트)

- **메모 & 채팅 (저장 + 실시간)**
  - `/memo`, `/chat` 라우트로 tripId 기준 CRUD 지원
  - Socket.IO 핸들러(`sockets/chatHandler.mjs`, `sockets/memoHandler.mjs`)를 통해
    - 메모 생성/삭제, 채팅 메시지를 룸(여행) 단위로 브로드캐스트
    - DB에 영구 저장하여 새로고침 이후에도 유지

- **버킷리스트·일정·예산**
  - `/bucketlist`, `/schedule`, `/budget` 라우트로 여행/사용자 단위의 버킷리스트, 일정, 예산 정보 관리

- **실시간 협업 (Socket.IO)**
  - [`sockets/index.mjs`](sockets/index.mjs)에서 Socket.IO 서버 설정 및 룸/사용자 상태 관리
  - `join-room` / `leave-room` / `identify` 이벤트로 특정 여행 방에 참여
  - `/health` 엔드포인트에서 현재 룸/사용자/메모 통계 조회 가능

### 기술 스택

- **런타임/프레임워크**
  - Node.js (ESM)
  - Express

- **데이터베이스**
  - MongoDB
  - Mongoose (스키마/모델 관리)

- **인증/보안**
  - JSON Web Token (JWT)
  - bcrypt/bcryptjs (비밀번호 해싱)
  - express-validator (입력 검증)

- **실시간 통신**
  - Socket.IO (`Server` 생성 후 `new Server(server, ...)` 형태)

- **AI & 외부 연동**
  - Python 3
  - `controller/TripPlan.py` + Google Gemini API

- **기타**
  - dotenv (환경 변수)
  - cors
  - express-session (초대 링크 등 세션 기반 기능)
  - multer (파일 업로드 – 프로필 이미지)

### 폴더 구조

```text
Server/
├── README.md
├── app.mjs                  # Express 앱, 정적 파일 서빙, Socket.IO 서버 진입점
├── package.json
├── package-lock.json
├── config/
│   ├── db.mjs               # MongoDB 연결 (mongoose.connect)
│   ├── jwt.js               # JWT 관련 설정/시크릿
│   ├── session.mjs          # express-session 설정
│   ├── gemini.js            # Gemini API 설정
│   ├── host.mjs             # 호스트 관련 설정
│   └── public_url.mjs       # 퍼블릭 URL 관련 설정
│
├── middleware/
│   ├── auth.mjs             # JWT 인증 미들웨어 (isAuth)
│   ├── validator.mjs        # express-validator 통합
│   └── upload.mjs           # multer 업로드 설정 (프로필 이미지 등)
│
├── router/
│   ├── user.mjs             # /user (signup, login, me, profile, password, customize 등)
│   ├── trip.mjs             # /trip (여행 CRUD, 초대 링크, 초대 참여)
│   ├── plan.mjs             # /plan (AI 경로 생성 /plan/generate)
│   ├── route.mjs            # /route (경로 조회/생성)
│   ├── memo.mjs             # /memo (메모 CRUD)
│   ├── chat.mjs             # /chat (채팅 CRUD)
│   ├── bucket.mjs           # /bucketlist (버킷리스트 + 아이템)
│   ├── budget.mjs           # /budget (예산/지출)
│   └── schedule.mjs         # /schedule (일정)
│
├── controller/
│   ├── user.mjs             # 사용자 관련 비즈니스 로직
│   ├── trip.mjs             # 여행 관련 비즈니스 로직
│   ├── bucket.mjs           # 버킷리스트
│   ├── memo.mjs             # 메모
│   ├── chat.mjs             # 채팅
│   ├── budget.mjs           # 예산
│   ├── schedule.mjs         # 일정
│   └── TripPlan.py          # Python 기반 AI 경로 생성 스크립트
│
├── dao/
│   ├── user.mjs             # User DAO
│   ├── trip.mjs             # Trip DAO
│   ├── bucket.mjs           # Bucket DAO
│   ├── memo.mjs             # Memo DAO
│   ├── chat.mjs             # Chat DAO
│   ├── budget.mjs           # Budget DAO
│   └── schedule.mjs         # Schedule DAO
│
├── models/
│   ├── User.js              # 사용자 스키마 (가상 필드에 stats 등 포함)
│   ├── Trip.mjs             # 여행 스키마
│   ├── Route.mjs            # 경로 스키마
│   ├── Place.mjs            # 장소 스키마
│   ├── Memo.js              # 메모 스키마
│   ├── ChatMessage.mjs      # 채팅 메시지 스키마
│   ├── Bucket.js            # 버킷리스트
│   ├── Schedule.js          # 일정
│   ├── Budget.js            # 예산
│   └── Template.js          # 템플릿
│
└── sockets/
    ├── index.mjs            # Socket.IO 초기화, 룸/사용자/메모 상태 관리
    ├── chatHandler.mjs      # 채팅 이벤트 처리
    ├── memoHandler.mjs      # 메모 이벤트 처리
    └── videoHandler.mjs     # 화상(WebRTC 시그널링) 이벤트 처리
```

### 주요 API 개요

> 아래 경로들은 `app.mjs`에서 설정된 prefix 기준입니다.  
> 예: `/user/login`은 실제로 `http://<host>/user/login` 형태로 호출합니다.

- **/user**
  - `POST /signup` – 회원가입
  - `POST /login` – 로그인(JWT 발급)
  - `POST /me` – 로그인 유지/내 정보 조회 (JWT 필요)
  - `PUT /profile` – 프로필 정보 + 이미지 수정
  - `PUT /password` – 비밀번호 변경
  - `DELETE /:id` – 사용자 삭제
  - `PATCH /:tripId/customize` – 템플릿 이모지·배경색 등 커스터마이즈
  - `GET /trip_styles` – 사용자 여행 스타일/템플릿 정보

- **/trip**
  - `GET /` – 특정 상태의 여행 목록
  - `GET /mine` – 나의 여행 목록
  - `GET /trip_history` – 여행 히스토리
  - `GET /:tripId` – 특정 여행 상세
  - `GET /:tripId/status` – 특정 여행 상태
  - `POST /` – 새 여행 생성
  - `PUT /:tripId` – 여행 정보 수정
  - `DELETE /:tripId` – 여행 삭제
  - `POST /:tripId/invite-link` – 초대 링크 생성
  - `GET /join/:inviteToken` – 초대 링크 검증
  - `POST /join/:inviteToken` – 초대 링크로 여행 참여
  - `DELETE /:tripId/leave` – 여행 나가기

- **/plan**
  - `POST /generate` – AI 여행 경로 생성 (Python TripPlan.py 호출)

- **/route**
  - `GET /latest` – 최신 경로 조회
  - `GET /by-trip/:tripId` – 특정 여행의 경로 조회
  - `POST /directions` – 경로/방향 계산

- **/memo**
  - `POST /` – 메모 생성
  - `GET /:tripId` – 특정 여행의 메모 목록
  - `PUT /:id` – 메모 수정
  - `DELETE /:id` – 특정 메모 삭제
  - `DELETE /:tripId` – 특정 여행의 메모 전체 삭제

- **/chat**
  - `POST /` – 채팅 메시지 생성
  - `GET /:tripId` – 특정 여행의 채팅 내역
  - `DELETE /:id` – 특정 메시지 삭제
  - `DELETE /:tripId` – 특정 여행의 메시지 전체 삭제

- **/bucketlist**
  - `GET /` – 내 버킷리스트 목록
  - `GET /:id` – 버킷리스트 상세
  - `POST /` – 버킷리스트 생성
  - `POST /:id/items` – 버킷리스트 아이템 추가
  - `PATCH /:id/items/:itemId` – 아이템 수정
  - `DELETE /:id` – 버킷리스트 삭제
  - `DELETE /:id/items/:itemId` – 아이템 삭제

- **/budget**
  - `POST /` – 지출/예산 기록 생성
  - `GET /my/:tripId` – 특정 여행에 대한 나의 지출 목록
  - `PUT /:expenseId` – 지출 수정
  - `DELETE /:expenseId` – 지출 삭제

- **/schedule**
  - `POST /` – 일정 생성
  - `GET /my/:tripId` – 특정 여행의 나의 일정 목록
  - `PUT /:scheduleId` – 일정 수정
  - `DELETE /:scheduleId` – 일정 삭제

- **기타**
  - `GET /health` – Socket.IO 연결/룸/사용자/메모 통계 조회

### 환경 변수 (.env)

> 실제 변수명은 프로젝트 설정에 따라 달라질 수 있습니다. 대표적인 예시는 아래와 같습니다.

- `DBURL` – MongoDB 연결 문자열 (필수)
- `JWT_SECRET` – JWT 서명 시크릿 (필수, `config/jwt.js`와 일치해야 함)
- `SESSION_SECRET` – express-session 시크릿 (`config/session.mjs`, 필수)
- `GEMINI_API_KEY` 또는 유사한 이름 – Google Gemini API 키 (`config/gemini.js` 또는 `TripPlan.py`에서 사용)
- (선택) `PORT` – 서버 포트
- (선택) CORS 관련 설정 값

**필수 항목**: `DBURL`, `JWT_SECRET`, `SESSION_SECRET`, Gemini 관련 API 키

### 실행 방법

1. 의존성 설치

   ```bash
   cd Server
   npm install
   ```

2. 개발 모드 실행 (자동 재시작 – nodemon)

   ```bash
   npm run dev
   ```

3. 프로덕션/단순 실행

   ```bash
   npm start    # node app.mjs
   ```
