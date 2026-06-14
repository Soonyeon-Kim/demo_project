# 채팅방 분석 리포트 UI 리디자인 — 설계

- **날짜**: 2026-06-14
- **상태**: 승인됨 (구현 대기)
- **대상 파일**: `app/page.tsx`, `app/globals.css`, `app/layout.tsx`, 신규 `components/report/`

## Context

업로드 결과 리포트(`app/page.tsx`)의 UI/UX가 빈약하다는 피드백에서 출발. 원인은 차트 종류가 아니라 **여백·시각적 위계·색 사용·차트 라벨 부재**다. 245줄짜리 단일 클라이언트 컴포넌트에 폼·데이터 패칭·전체 렌더가 인라인으로 뭉쳐 있어 손보기도 어렵다.

브레인스토밍 결론(비주얼 컴패니언으로 방향 확정):
- **방향 A — 정제형**: 현재의 세로 4섹션 구조를 유지하고 여백·위계·색·차트 라벨만 제대로 잡는다. (대시보드형 B의 "상단 KPI 강조"는 차용)
- **구현 A — 순수 Tailwind, 의존성 0**: shadcn/Recharts 도입 없음. Next 16 / React 19 / Tailwind v4 최신 조합의 호환 리스크를 피하고 MVP를 가볍게 유지. 차트는 단순(가로 막대 + 24시간 미니 막대)이라 손수 구현으로 충분.

## Goals / Non-goals

**Goals**
- 같은 정보를 더 읽기 쉽고 정돈된 화면으로 — 여백·위계·1액센트 색·차트 라벨.
- `page.tsx`를 폼/패칭만 남기고, 리포트를 작은 프레젠테이션 컴포넌트로 분리.
- 데이터 추가 없이 기존 `AnalyzeResult` 필드만으로 가능한 작은 가독성 개선 포함.

**Non-goals**
- 백엔드/데이터 계약 변경 없음 (`lib/`, `app/api/`, `lib/types.ts` 무변경).
- 새 npm 의존성 없음. 차트 라이브러리·컴포넌트 프레임워크 도입 안 함.
- 다크 모드 정식 지원은 이번 패스 제외(후속). 라이트 모드만 깔끔히.
- 구조 재편(대시보드 그리드/Wrapped 스토리) 안 함 — 세로 4섹션 유지.

## 결정 사항 (확정)

| 항목 | 결정 |
|------|------|
| 디자인 방향 | A · 정제형 (구조 유지 + 폴리시) |
| 구현 기반 | 순수 Tailwind v4, 신규 의존성 0 |
| 다크 모드 | 라이트 모드만 (절반 적용된 다크 토큰은 정리) |
| 액센트 색 | 인디고 `#4f46e5` 1색 + 중립 회색 |
| 차트 | 손수 구현 유지(가로 막대 + 24시간 막대), 라벨/피크 강조 추가 |

## 아키텍처 — 컴포넌트 분리

`app/page.tsx`(클라이언트)는 **업로드 폼 + fetch + 상태(loading/error/result)**만 보유. 리포트 렌더는 `components/report/`로 추출:

- `Report.tsx` — `AnalyzeResult`를 받아 섹션들을 조립(현재 인라인 `Report` 역할).
- `KpiRow.tsx` — 메시지/참여자/시스템/기간 KPI 4칸 (상단 강조).
- `SummaryCard.tsx` — 전체 요약. mock 마커 감지 시 `MOCK` 뱃지 표시.
- `TopicList.tsx` — 토픽 카드 목록.
- `SenderBars.tsx` — 활동 멤버 가로 막대(정렬, 카운트).
- `HourlyChart.tsx` — 24시간 막대 + 축 라벨 + 피크 강조 + "최다 N시" 캡션.
- `ActionItemList.tsx` + `PriorityBadge.tsx` — 액션 아이템 행 + 높음/보통/낮음 뱃지.
- `Section.tsx` — 섹션 라벨 + 콘텐츠 래퍼.

각 컴포넌트는 `AnalyzeResult`의 해당 슬라이스(props)만 받는 순수 표시 컴포넌트. `lib/types.ts`의 기존 타입 재사용(`Stats`, `Analysis`, `SenderCount`, `HourBucket`, `Priority`, `ActionItem`, `Topic`). 비즈니스 로직 없음 → 프로젝트 규약상 `components/`는 TDD 가드 면제.

> 비고: 표시용 헬퍼 `days(start,end)`(기간 일수 계산)는 현재 `page.tsx` 하단에 있음 — `components/report/utils.ts` 같은 곳으로 함께 이동.

## 디자인 시스템 (`app/globals.css`)

- **토큰**: `--accent:#4f46e5`, 중립(ink `#0f172a`, muted `#64748b`, line `#e2e8f0`, soft bg `#f8fafc`). 기존 `globals.css` 패턴대로 `:root`에 CSS 변수로 정의하고 `@theme inline`으로 노출해 Tailwind 색 유틸리티(예: `text-ink`, `bg-soft`, `border-line`, `bg-accent`)로 사용. 인라인 스타일/임의값 남발 금지.
- **폰트 정리**: 현재 `body { font-family: Arial... }`가 로드된 Geist를 덮어씀 → Geist(`--font-geist-sans`)를 실제로 쓰도록 수정.
- **다크 토큰 정리**: `prefers-color-scheme: dark` 블록은 리포트 카드들이 라이트 고정이라 불일치를 만들므로 이번 패스에서 라이트 기준으로 정돈(다크 정식 지원은 후속 과제로 명시만).
- **카드**: 1px `line` 보더 + radius 12 + 은은한 그림자, 전 섹션 일관.
- **위계**: 섹션 라벨(11px 대문자 muted) + 넉넉한 섹션 간격(약 26px).

## 섹션별 스펙 (목업 기준)

1. **헤더**: 제목 + 부제(기간 범위 · 메시지 수). KPI 줄을 상단에 강조 배치.
2. **KPI 줄**: 4칸 카드(메시지/참여자/시스템/기간), 숫자 22px bold + 라벨 12px muted.
3. **전체 요약**: soft 배경 카드, line-height 1.75. `analysis.summary`에 mock 마커(`모의(mock)`) 포함 시 `MOCK` 앰버 뱃지. `analysis`가 null이면 `analysisError`를 Notice로(기존 동작 유지). `truncated`면 안내 문구.
4. **주요 토픽**: 각 토픽을 dot + title + detail 카드로. 없으면 Notice.
5. **활동 멤버**: 카운트 내림차순 가로 막대(트랙 `accent-soft`, 채움 `accent`), 이름·카운트 라벨. 데이터 없으면 Notice.
6. **시간대별**: 24개 막대, 0/6/12/18/23시 축 라벨, 최다 시간대 막대는 accent로 강조 + "가장 활발한 시간대: N시" 캡션.
7. **액션 아이템**: 각 행 = 우선순위 뱃지(높음 red / 보통 amber / 낮음 gray) + task(bold) + context(muted). 없으면 Notice.

기존의 graceful-degradation 분기(analysis null → analysisError, 빈 배열 → Notice)와 `warnings` 배너는 그대로 보존.

## Verification

- 프레젠테이션 변경이므로 lib 단위 테스트 대상 아님. 기존 `npm test` 22개 **회귀 없음** 확인.
- `ANALYZE_MOCK=1 npm run dev`로 dev 서버 기동 → 브라우저에서 CSV/카카오 업로드 → 4섹션(요약 MOCK 뱃지·토픽·KPI/막대/시간대 라벨·우선순위 뱃지)이 의도대로 렌더되는지 관찰.
- 키 없음/분석 실패 경로(analysis null)에서 Notice 폴백이 깨지지 않는지 확인.
- `npm run build`로 타입/빌드 통과 확인.

## Risks / Notes

- `page.tsx`는 `"use client"`; 추출 컴포넌트는 props만 받는 순수 컴포넌트라 서버/클라이언트 경계 이슈 없음(Report 트리는 클라이언트 하위).
- Tailwind v4는 설정이 CSS-우선(`@import "tailwindcss"`)이라 토큰을 `globals.css`에서 정의. 별도 `tailwind.config` 없음.
- 다크 모드를 후속에서 추가할 때를 대비해 색은 토큰으로 분리(하드코딩 최소화).
