# Handoff — 2026-06-14

> 시점 상태 스냅샷. 상세는 `docs/superpowers/`의 spec/plan과 `CLAUDE.md`를 본다(여기선 복붙하지 않음).
> **운영 규칙:** 세션 끝마다 `TL;DR` + `다음에 이어서` 두 곳만 갱신. 길어지면 plan/spec으로 내린다.

## TL;DR
도구 정비 + 키 없는 `ANALYZE_MOCK` mock 모드는 완료·푸시됨. **리포트 UI 리디자인은 설계·계획만 푸시(`de54685`)했고 구현 코드는 0.** 다음 작업은 계획 실행이며, 첫 결정은 실행 방식 선택.

## 동기화 상태
- `main == origin/main == de54685`, 작업트리 클린.
- 최근 커밋: `de54685` design update(스펙+계획) · `1098a0a` agentic tooling · `bddb6c6` validation(tdd guard).
- 테스트: `npm test` → **27 passing** (5 files).

## 완료 (이번 세션)
- 테스트 점검 + `parseKakao` 멀티데이 / 라우트 확장자 테스트 보강.
- 도구 정비(`1098a0a`): 권한 허용목록(개인) · 커버리지(`@vitest/coverage-v8`, `npm run coverage`) · `/e2e-upload` 명령 · `ANALYZE_MOCK` mock 모드 · CLAUDE.md 노트(Windows/TDD가드/커버리지/mock).
- mock 모드 e2e 라이브 검증(키 없이 stats+analysis 반환 확인).
- UI 리디자인 **설계 스펙 + 8태스크 구현 계획** 작성·푸시(`de54685`).

## 다음에 이어서 (Resume here) ★
1. **실행 방식 선택**: 인라인 vs 서브에이전트. (추천: 인라인 — 8태스크가 선형 의존·소규모)
2. **계획 실행**: `docs/superpowers/plans/2026-06-14-report-ui-redesign.md` (T1 토큰/폰트 → T2–7 `components/report/` → T8 `page.tsx` 재배선).
3. **검증**: 태스크별 `npx tsc --noEmit` → 최종 `npm run build` + `npm test`(27) + `ANALYZE_MOCK=1`로 dev 화면 육안 확인.

## 굳어진 결정 + 이유 (재논의 방지)
- **방향 A 정제형** / **순수 Tailwind(의존성 0)** / **라이트 전용** / **인디고 `#4f46e5`**.
- 왜: Next16+React19+Tailwind v4 최신 조합에서 shadcn/Recharts 호환 리스크 회피 + MVP 경량 유지. "형편없음"의 원인은 차트 종류가 아니라 여백·위계·색·라벨이라 라이브러리 없이 해결 가능.

## 열린 이슈 / 리스크
- 🔴 **#1 리디자인 구현 미착수** — 위 Resume.
- 🔴 **#2 `lib/analyze.ts` 실제 OpenAI 분기 무테스트** (~153–193행: 성공/length/refusal/빈응답/parse/catch). "키 없어도 우아하게 실패"라는 문서화된 핵심 불변식이 무방비. **다음 테스트 1순위.** (키 없음/mock 경로만 커버됨)
- 🟡 **#3 `app/globals.css` 폰트 버그** — Geist 로드 후 `body{font-family:Arial}`로 덮어씀. 계획 T1에서 수정, **현재 main엔 살아 있음.**
- 🟡 **#4 반쯤 적용된 다크 모드** — 토큰만 있고 리포트는 라이트 하드코딩. 계획상 라이트 전용으로 정리(미적용).
- 🟡 **#5 UI 무테스트** — `page.tsx` 커버리지 0%, jsdom 없음. 리디자인으로 프레젠테이션 코드 증가 예정.
- 🟢 **#7 권한 허용목록 개인·비커밋** — `.claude/settings.local.json`은 gitignore → 이 머신에서만 작동.
- 🟢 **#8 PowerShell 매처 미검증** — `PowerShell(...)` 허용은 추측. 미지원이면 무시되어 그냥 승인 프롬프트가 뜸.
- 🟢 **#9 `ANALYZE_MOCK` 키-우선 미라이브검증** — 유닛 테스트만, 실제 키로 미확인.
- 🟢 **#10 npm audit moderate 2건** — coverage-v8 설치 시 보고. 점검 필요.
- ⚪ **#12 `.gitattributes` 없음** — 커밋마다 LF→CRLF 경고, 머신 간 diff 노이즈 가능.

## 환경·함정 (Gotchas)
- **Windows**: `python`(not `python3` — 스토어 스텁 exit 49); 한글/비ASCII 출력 스크립트는 `PYTHONUTF8=1`.
- **TDD 가드**(`.claude/hooks/tdd-guard.sh`): `lib/` 소스는 테스트 먼저 작성해야 Write 허용. `components/`·`page.tsx`·`*.config.*`·`types/`·`*.md`는 면제.
- **키 없이 점검**: `ANALYZE_MOCK=1` (`.env` 또는 `$env:ANALYZE_MOCK="1"`) → 결정론적 mock 분석(요약에 `모의(mock)` 마커).
- **`/e2e-upload`** 슬래시 명령: dev 서버에 샘플 업로드 스모크 테스트(프로젝트 로컬 `./.tmp-e2e/` 사용).
- **커버리지**: `npm run coverage` (v8).

## 스크래치 (gitignore — 무시)
- `.tmp-e2e/` (mock 점검 산출물: result.json/html, 샘플 파일)
- `.superpowers/brainstorm/` (비주얼 컴패니언 목업)

## 참고 링크
- 설계 스펙: `docs/superpowers/specs/2026-06-14-report-ui-redesign-design.md`
- 구현 계획: `docs/superpowers/plans/2026-06-14-report-ui-redesign.md`
- 규약: `CLAUDE.md` · `app/api/CLAUDE.md` · `architecture.md`
