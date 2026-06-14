---
description: /api/analyze 엔드포인트에 샘플 채팅 파일을 업로드해 end-to-end 스모크 테스트
argument-hint: "[kakao|csv]  (기본: kakao)"
---

`/api/analyze`에 샘플 파일을 실제로 업로드해 stats가 돌아오는지 확인한다. 형식 인자: `$ARGUMENTS` (비어 있으면 `kakao`).

## 절차

1. **dev 서버 확인.** `curl.exe -s -o /dev/null -w "%{http_code}" http://localhost:3000` 로 200 류 응답을 확인한다. 안 뜨면 사용자에게 `npm run dev` 를 켜 달라고 안내하고 중단.

2. **샘플 파일 생성** — 프로젝트 로컬 `./.tmp-e2e/` 에 만든다. (홈(`~`)이나 시스템 temp 경로는 쓰지 말 것 — 업로드 curl이 샌드박스 오탐 "system path '~' blocked" 으로 거부된 적 있음. `.tmp-e2e/`는 `.gitignore`에 등록돼 있음.)

   - `kakao` → `./.tmp-e2e/sample.txt`:
     ```
     --------------- 2026년 5월 24일 일요일 ---------------
     [차라] [오전 3:03] 자료 공유 가능할까요?
     [부경대] [오후 12:45] 안녕하세요, 내일 회의 5시 맞죠?
     [차라] [오후 12:50] 네 맞습니다
     ```
   - `csv` → `./.tmp-e2e/sample.csv`:
     ```
     Date,User,Message
     2025-05-10 09:12,minji,오늘 5시 회의 회의실 B 맞죠?
     2025-05-10 09:13,jaeha,네 맞아요
     ```

3. **업로드.** 절대경로 대신 프로젝트 상대경로를 쓰고, MIME 타입을 명시한다:
   ```bash
   # kakao
   curl.exe -s -F "file=@./.tmp-e2e/sample.txt;type=text/plain" http://localhost:3000/api/analyze
   # csv
   curl.exe -s -F "file=@./.tmp-e2e/sample.csv;type=text/csv" http://localhost:3000/api/analyze
   ```

4. **검증.** 응답 JSON에서 `stats.totalMessages`, `stats.participants`, `stats.topSenders` 가 채워졌는지 확인한다. `OPENAI_API_KEY` 가 없으면 `analysis: null` + `analysisError` 가 정상(graceful degradation) — stats만 보면 됨. HTTP 400이면 에러 메시지를 그대로 보고. (키 없이 **분석 섹션까지** 채워 보려면 dev 서버를 `ANALYZE_MOCK=1` 로 띄운다 — `analysis`가 결정론적 mock으로 반환됨.)

5. **정리.** `rm -rf ./.tmp-e2e` 로 임시 디렉터리를 지운다.

> 참고: 자동화된 라우트 단위 테스트는 `app/api/analyze/__tests__/route.test.ts` 에 있고 네트워크 없이 돈다. 이 명령은 **실제 dev 서버**에 대한 수동 스모크 확인용이다.
