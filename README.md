# 채팅방 분석 (MVP)

채팅방 메시지 CSV를 업로드하면 **전체 요약 · 주요 토픽/이슈 · 활동 통계 · 액션 아이템**을 만들어 주는 간단한 프로토타입 웹앱. 커뮤니티 방장(관리자)을 위한 도구입니다.

- 프레임워크: Next.js (App Router) + TypeScript + Tailwind CSS
- 분석 엔진: OpenAI API (서버 사이드 호출, 구조화 출력)
- 데이터베이스/로그인 없음 — 업로드 → 분석 → 화면 표시 (1회성)

## 빠른 시작

```bash
npm install
npm run dev          # http://localhost:3000
```

브라우저에서 CSV를 업로드하면 분석 결과가 표시됩니다. 예시 파일: `sample/chat.csv`.

## OpenAI 연결

1. https://platform.openai.com → **API keys** 에서 키 발급 (결제수단/크레딧 등록 필요)
2. 프로젝트 루트 `.env` 에 다음을 입력 (`.gitignore` 로 커밋되지 않음):
   ```
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini     # 선택, 생략 시 gpt-4o-mini
   ```
3. `.env` 변경 후 `npm run dev` 재시작
4. 키는 서버 라우트(`app/api/analyze/route.ts`)에서만 사용되며 브라우저에 노출되지 않습니다.

> 키가 없어도 앱은 동작합니다 — **활동 통계**는 정상 표시되고, 요약/토픽/액션 아이템 섹션만 안내 메시지가 표시됩니다.

## 입력 CSV 형식

헤더 포함 UTF-8, 컬럼은 `Date, User, Message`:

```csv
Date,User,Message
2025-05-10 09:12,minji,오늘 5시 회의 회의실 B 맞죠?
2025-05-10 10:30,bot,새 멤버님이 들어왔습니다
```

- `Date`: `YYYY-MM-DD HH:MM`
- `User`: 보낸 사람 (`bot` 등 시스템 계정은 분석/순위에서 제외)
- `Message`: 메시지 본문
- 다른 export 형식을 쓰려면 `lib/parseChat.ts` 의 컬럼 매핑(`COL`)과 시스템 계정 목록(`SYSTEM_USERS`)만 수정하면 됩니다.

### 카카오톡 내보내기(.txt)도 지원

카카오톡 PC 대화 내보내기 `.txt` 파일을 그대로 업로드하면 자동으로 위 CSV 형식으로 변환해 인식합니다 (`lib/parseKakao.ts`).

- `[보낸사람] [오전/오후 H:MM] 메시지` 헤더 파싱 + 날짜 구분선으로 날짜 추적, 오전/오후 → 24시간 변환
- 헤더 없는 다음 줄(빈 줄 포함)은 직전 메시지에 병합 (여러 줄 메시지)
- 입장/퇴장/"메시지가 삭제되었습니다" 같은 시스템 줄은 제외
- 업로드 파일명이 `.txt`면 카카오 파서, `.csv`면 표준 CSV 파서로 자동 분기 (`app/api/analyze/route.ts`)

## 구조

| 경로 | 역할 |
|------|------|
| `lib/parseChat.ts` | CSV → 메시지 배열 (봇 표시) |
| `lib/parseKakao.ts` | 카카오톡 `.txt` → 메시지 배열 (시스템 줄 제외) |
| `lib/stats.ts` | 활동 통계 계산 (LLM 불필요) |
| `lib/analyze.ts` | OpenAI 호출 → 요약·토픽·액션아이템 |
| `app/api/analyze/route.ts` | 업로드 처리 → 통계 + 분석 JSON 반환 |
| `app/page.tsx` | 업로드 폼 + 리포트 렌더링 |

## 테스트

```bash
npm test       # vitest (파싱·통계·전사·라우트 검증)
```
