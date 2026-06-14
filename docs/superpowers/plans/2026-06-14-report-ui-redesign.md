# 채팅방 분석 리포트 UI 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 업로드 결과 리포트(`app/page.tsx`)를 순수 Tailwind로 정제 — 여백·위계·1색 액센트·차트 라벨을 잡고, 인라인 렌더를 `components/report/`로 분리한다.

**Architecture:** 데이터 계약(`AnalyzeResult`)·`lib/`·`app/api/`는 무변경. `page.tsx`는 업로드 폼+fetch+상태만 남기고, 리포트는 props만 받는 순수 프레젠테이션 컴포넌트들로 조립. 색은 `globals.css`의 `@theme inline` 토큰으로.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 (CSS-first, 신규 의존성 없음).

> **검증 방식 메모:** 이 프로젝트는 `components/`/`page.tsx`를 프레젠테이션 레이어로 보고 유닛 테스트를 강제하지 않는다(로직은 `lib/`에서 TDD). 따라서 각 태스크 검증은 **`npx tsc --noEmit`(타입)**, 최종 태스크에서 **`npm run build` + 실제 dev 화면 + `npm test` 회귀(22개)**로 한다. `components/`·`*.css`·`page.tsx`는 TDD 가드 면제 경로라 Write가 차단되지 않는다.

---

## File Structure

- **Modify** `app/globals.css` — 디자인 토큰(`@theme inline`) 추가, body 폰트 Geist로 수정, 절반만 적용된 다크 블록 제거(라이트 전용).
- **Create** `components/report/utils.ts` — `days()` 헬퍼.
- **Create** `components/report/Section.tsx` — 섹션 라벨 + 콘텐츠 래퍼.
- **Create** `components/report/Notice.tsx` — 비어있음/에러 안내.
- **Create** `components/report/KpiRow.tsx` — KPI 4칸.
- **Create** `components/report/SummaryCard.tsx` — 요약(+MOCK 뱃지).
- **Create** `components/report/TopicList.tsx` — 토픽 목록.
- **Create** `components/report/SenderBars.tsx` — 활동 멤버 가로 막대.
- **Create** `components/report/HourlyChart.tsx` — 24시간 막대 + 축 라벨 + 피크.
- **Create** `components/report/PriorityBadge.tsx` — 우선순위 뱃지.
- **Create** `components/report/ActionItemList.tsx` — 액션 아이템 목록.
- **Create** `components/report/Report.tsx` — 위 컴포넌트 조립.
- **Modify** `app/page.tsx` — 인라인 렌더 제거, `<Report result={result} />` 사용.

섹션 순서(목업 기준): 헤더(제목+기간) → KPI 줄 → 전체 요약 → 주요 토픽 → 활동 멤버 → 시간대별 → 액션 아이템.

---

## Task 1: 디자인 토큰 + 폰트 정리 (`globals.css`)

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: `app/globals.css` 전체를 아래로 교체**

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #0f172a;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  /* 리포트 디자인 토큰 — 중립 회색 + 인디고 액센트 1색 */
  --color-ink: #0f172a;
  --color-muted: #64748b;
  --color-line: #e2e8f0;
  --color-soft: #f8fafc;
  --color-accent: #4f46e5;
  --color-accent-soft: #eef2ff;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-geist-sans), system-ui, -apple-system, sans-serif;
}
```

(다크 `@media (prefers-color-scheme: dark)` 블록은 의도적으로 삭제 — 이번 패스는 라이트 전용. body 폰트도 Arial → Geist로 교정.)

- [ ] **Step 2: 타입/빌드 영향 없음 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 종료(코드 0). CSS 변경이라 타입 영향 없음.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: 리포트 디자인 토큰 추가 + Geist 폰트 적용 (라이트 전용)"
```

---

## Task 2: 공용 프리미티브 (`utils.ts`, `Section.tsx`, `Notice.tsx`)

**Files:**
- Create: `components/report/utils.ts`
- Create: `components/report/Section.tsx`
- Create: `components/report/Notice.tsx`

- [ ] **Step 1: `components/report/utils.ts` 작성**

```ts
/** 기간 일수 표시용 ("YYYY-MM-DD HH:MM" start~end에서 대략 일수 계산) */
export function days(start: string, end: string | null): string {
  if (!end) return "1일";
  const s = new Date(start.replace(" ", "T")).getTime();
  const e = new Date(end.replace(" ", "T")).getTime();
  const d = Math.max(1, Math.round((e - s) / 86400000) + 1);
  return `${d}일`;
}
```

- [ ] **Step 2: `components/report/Section.tsx` 작성**

```tsx
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">{title}</h2>
      {children}
    </section>
  );
}
```

- [ ] **Step 3: `components/report/Notice.tsx` 작성**

```tsx
export function Notice({ text }: { text: string }) {
  return <p className="rounded-lg bg-soft px-3 py-2 text-sm text-muted">{text}</p>;
}
```

- [ ] **Step 4: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add components/report/utils.ts components/report/Section.tsx components/report/Notice.tsx
git commit -m "feat(report): 공용 프리미티브(Section/Notice/days) 추가"
```

---

## Task 3: KPI 줄 + 요약 카드

**Files:**
- Create: `components/report/KpiRow.tsx`
- Create: `components/report/SummaryCard.tsx`

- [ ] **Step 1: `components/report/KpiRow.tsx` 작성**

```tsx
import type { Stats } from "@/lib/types";
import { days } from "./utils";

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line p-3.5 text-center">
      <div className="text-2xl font-bold tracking-tight text-ink">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

export function KpiRow({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <Kpi label="메시지" value={stats.totalMessages} />
      <Kpi label="참여자" value={stats.participants} />
      <Kpi label="시스템 메시지" value={stats.totalSystemMessages} />
      <Kpi
        label="기간"
        value={stats.periodStart ? days(stats.periodStart, stats.periodEnd) : "—"}
      />
    </div>
  );
}
```

- [ ] **Step 2: `components/report/SummaryCard.tsx` 작성**

```tsx
import type { Analysis } from "@/lib/types";
import { Notice } from "./Notice";

export function SummaryCard({
  analysis,
  analysisError,
  truncated,
}: {
  analysis: Analysis | null;
  analysisError?: string;
  truncated: boolean;
}) {
  const isMock = !!analysis && analysis.summary.includes("모의(mock)");
  return (
    <>
      {analysis ? (
        <div className="rounded-xl border border-line bg-soft p-4 text-sm leading-7 text-ink">
          {isMock && (
            <span className="mr-1.5 rounded-full bg-amber-100 px-2 py-0.5 align-top text-[11px] font-bold text-amber-800">
              MOCK
            </span>
          )}
          <span className="whitespace-pre-wrap">{analysis.summary}</span>
        </div>
      ) : (
        <Notice text={analysisError ?? "요약을 생성하지 못했습니다."} />
      )}
      {truncated && (
        <p className="mt-2 text-xs text-muted">
          ※ 메시지가 많아 가장 최근 메시지 위주로 분석했습니다.
        </p>
      )}
    </>
  );
}
```

- [ ] **Step 3: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add components/report/KpiRow.tsx components/report/SummaryCard.tsx
git commit -m "feat(report): KPI 줄 + 요약 카드(MOCK 뱃지) 추가"
```

---

## Task 4: 토픽 목록 + 활동 멤버 막대

**Files:**
- Create: `components/report/TopicList.tsx`
- Create: `components/report/SenderBars.tsx`

- [ ] **Step 1: `components/report/TopicList.tsx` 작성**

```tsx
import type { Topic } from "@/lib/types";
import { Notice } from "./Notice";

export function TopicList({ topics, fallback }: { topics: Topic[]; fallback: string }) {
  if (topics.length === 0) return <Notice text={fallback} />;
  return (
    <ul className="flex flex-col gap-2">
      {topics.map((t, i) => (
        <li key={i} className="flex gap-2.5 rounded-lg border border-line p-3">
          <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-accent" />
          <div>
            <div className="text-sm font-medium text-ink">{t.title}</div>
            <div className="mt-0.5 text-[13px] text-muted">{t.detail}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: `components/report/SenderBars.tsx` 작성**

`topSenders`는 `computeStats`에서 이미 내림차순 정렬되어 들어온다(`senders[0]`가 최대).

```tsx
import type { SenderCount } from "@/lib/types";
import { Notice } from "./Notice";

export function SenderBars({ senders }: { senders: SenderCount[] }) {
  if (senders.length === 0) return <Notice text="표시할 데이터가 없습니다." />;
  const max = senders[0].count;
  return (
    <div className="flex flex-col gap-2">
      {senders.slice(0, 10).map((s) => (
        <div key={s.sender} className="flex items-center gap-2.5 text-[13px]">
          <div className="w-20 shrink-0 truncate text-right text-slate-600">{s.sender}</div>
          <div className="h-[18px] flex-1 overflow-hidden rounded-md bg-accent-soft">
            <div
              className="h-full rounded-md bg-accent"
              style={{ width: `${Math.max(4, (s.count / max) * 100)}%` }}
            />
          </div>
          <div className="w-6 shrink-0 text-muted">{s.count}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add components/report/TopicList.tsx components/report/SenderBars.tsx
git commit -m "feat(report): 토픽 목록 + 활동 멤버 막대 추가"
```

---

## Task 5: 시간대별 차트 (축 라벨 + 피크 강조)

**Files:**
- Create: `components/report/HourlyChart.tsx`

- [ ] **Step 1: `components/report/HourlyChart.tsx` 작성**

```tsx
import type { HourBucket } from "@/lib/types";

export function HourlyChart({ hourly }: { hourly: HourBucket[] }) {
  const max = Math.max(1, ...hourly.map((h) => h.count));
  const peakHours = hourly.filter((h) => h.count > 0 && h.count === max).map((h) => h.hour);
  return (
    <div>
      <div className="flex h-24 items-end gap-0.5">
        {hourly.map((h) => {
          const isPeak = h.count > 0 && h.count === max;
          return (
            <div
              key={h.hour}
              className="flex flex-1 flex-col items-center justify-end"
              title={`${h.hour}시: ${h.count}건`}
            >
              <div
                className={`w-full rounded-t ${isPeak ? "bg-accent" : "bg-slate-300"}`}
                style={{ height: `${(h.count / max) * 100}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
        <span>0시</span>
        <span>6시</span>
        <span>12시</span>
        <span>18시</span>
        <span>23시</span>
      </div>
      {peakHours.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          가장 활발한 시간대:{" "}
          <span className="font-medium text-ink">
            {peakHours.map((h) => `${h}시`).join(" · ")}
          </span>{" "}
          (각 {max}건)
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add components/report/HourlyChart.tsx
git commit -m "feat(report): 시간대별 차트(축 라벨·피크 강조·캡션) 추가"
```

---

## Task 6: 우선순위 뱃지 + 액션 아이템 목록

**Files:**
- Create: `components/report/PriorityBadge.tsx`
- Create: `components/report/ActionItemList.tsx`

- [ ] **Step 1: `components/report/PriorityBadge.tsx` 작성**

```tsx
import type { Priority } from "@/lib/types";

const MAP: Record<Priority, { label: string; cls: string }> = {
  high: { label: "높음", cls: "bg-red-100 text-red-700" },
  medium: { label: "보통", cls: "bg-amber-100 text-amber-700" },
  low: { label: "낮음", cls: "bg-slate-100 text-slate-600" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, cls } = MAP[priority];
  return (
    <span className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>
      {label}
    </span>
  );
}
```

- [ ] **Step 2: `components/report/ActionItemList.tsx` 작성**

```tsx
import type { ActionItem } from "@/lib/types";
import { Notice } from "./Notice";
import { PriorityBadge } from "./PriorityBadge";

export function ActionItemList({ items, fallback }: { items: ActionItem[]; fallback: string }) {
  if (items.length === 0) return <Notice text={fallback} />;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((a, i) => (
        <li key={i} className="flex items-start gap-2.5 rounded-lg border border-line p-3">
          <PriorityBadge priority={a.priority} />
          <div>
            <div className="text-sm font-medium text-ink">{a.task}</div>
            <div className="mt-0.5 text-[13px] text-muted">{a.context}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add components/report/PriorityBadge.tsx components/report/ActionItemList.tsx
git commit -m "feat(report): 우선순위 뱃지 + 액션 아이템 목록 추가"
```

---

## Task 7: 리포트 조립 (`Report.tsx`)

**Files:**
- Create: `components/report/Report.tsx`

- [ ] **Step 1: `components/report/Report.tsx` 작성**

```tsx
import type { AnalyzeResult } from "@/lib/types";
import { Section } from "./Section";
import { KpiRow } from "./KpiRow";
import { SummaryCard } from "./SummaryCard";
import { TopicList } from "./TopicList";
import { SenderBars } from "./SenderBars";
import { HourlyChart } from "./HourlyChart";
import { ActionItemList } from "./ActionItemList";

export function Report({ result }: { result: AnalyzeResult }) {
  const { stats, analysis, analysisError, warnings, truncated } = result;

  return (
    <div className="rounded-2xl border border-line p-6 sm:p-7">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-ink">분석 결과</h1>
        {stats.periodStart && (
          <span className="shrink-0 text-xs text-muted">
            {stats.periodStart} ~ {stats.periodEnd}
          </span>
        )}
      </header>

      {warnings.length > 0 && (
        <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warnings.map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </div>
      )}

      <div className="mt-5">
        <KpiRow stats={stats} />
      </div>

      <Section title="전체 요약">
        <SummaryCard analysis={analysis} analysisError={analysisError} truncated={truncated} />
      </Section>

      <Section title="주요 토픽 · 이슈">
        <TopicList
          topics={analysis?.topics ?? []}
          fallback={analysisError ?? "토픽이 없습니다."}
        />
      </Section>

      <Section title="활동 멤버">
        <SenderBars senders={stats.topSenders} />
      </Section>

      <Section title="시간대별 메시지">
        <HourlyChart hourly={stats.hourly} />
      </Section>

      <Section title="액션 아이템">
        <ActionItemList
          items={analysis?.actionItems ?? []}
          fallback={analysisError ?? "액션 아이템이 없습니다."}
        />
      </Section>
    </div>
  );
}
```

- [ ] **Step 2: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add components/report/Report.tsx
git commit -m "feat(report): Report 조립 컴포넌트 추가"
```

---

## Task 8: `page.tsx` 재배선 + 최종 검증

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: `app/page.tsx` 전체를 아래로 교체** (인라인 Report/Section/Notice/Kpi/SenderBars/HourlyBars/PriorityBadge/days 전부 제거, `Report` import)

```tsx
"use client";

import { useState } from "react";
import type { AnalyzeResult } from "@/lib/types";
import { Report } from "@/components/report/Report";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "분석 중 오류가 발생했습니다.");
      else setResult(data as AnalyzeResult);
    } catch {
      setError("요청을 보내지 못했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-ink">채팅방 분석</h1>
        <p className="mt-1 text-sm text-muted">
          채팅 CSV(<code>Date, User, Message</code>) 또는 카카오톡 내보내기(<code>.txt</code>)를
          올리면 요약·토픽·활동 통계·액션 아이템을 만들어 드립니다.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mb-8 flex flex-col gap-3 rounded-xl border border-line p-5 sm:flex-row sm:items-center"
      >
        <input
          type="file"
          accept=".csv,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-4 file:py-2 file:text-white hover:file:opacity-90"
        />
        <button
          type="submit"
          disabled={!file || loading}
          className="shrink-0 rounded-md bg-accent px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {loading ? "분석 중…" : "분석하기"}
        </button>
      </form>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {result && <Report result={result} />}
    </main>
  );
}
```

- [ ] **Step 2: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음. (구 인라인 컴포넌트가 모두 사라지고 `Report`만 참조)

- [ ] **Step 3: 프로덕션 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공(린트·타입 통과). 실패 시 메시지의 파일/행을 보고 해당 컴포넌트 수정.

- [ ] **Step 4: 기존 테스트 회귀 확인**

Run: `npm test`
Expected: `Test Files 5 passed`, `Tests 27 passed` (UI 변경이라 영향 없음).

- [ ] **Step 5: 실제 화면 시각 확인 (mock 모드)**

PowerShell: `$env:ANALYZE_MOCK="1"; npm run dev`  (Bash: `ANALYZE_MOCK=1 npm run dev`)
브라우저 http://localhost:3000 → 샘플 CSV/`.txt` 업로드.
Expected(목업과 일치):
- 상단 KPI 4칸(메시지/참여자/시스템/기간)
- 전체 요약 카드에 **MOCK** 앰버 뱃지 + 본문
- 주요 토픽 카드(점 + 제목 + 설명)
- 활동 멤버 가로 막대(인디고, 정렬, 카운트)
- 시간대별 막대 + 0/6/12/18/23시 축 + 피크 막대 인디고 + "가장 활발한 시간대" 캡션
- 액션 아이템 행 + 높음(빨강)/보통(앰버)/낮음(회색) 뱃지
확인 후 dev 서버 종료.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat(report): page.tsx를 분리된 report 컴포넌트로 재배선 (UI 정제 완료)"
```

---

## Self-Review (작성자 점검 결과)

- **Spec 커버리지:** 토큰/폰트/다크정리(T1) · 컴포넌트 분리 8개 파일(T2–T7) · KPI 상단 강조(T3/T7) · MOCK 뱃지(T3) · 차트 축/피크/캡션(T5) · 멤버 정렬(T4, 데이터가 이미 정렬) · 액션 뱃지(T6) · page 재배선(T8) · 검증(T8) — 스펙 항목 모두 태스크에 매핑됨.
- **플레이스홀더:** 없음. 모든 코드 스텝에 완전한 코드 포함.
- **타입 일관성:** 컴포넌트 props가 `lib/types.ts`의 `Stats/Analysis/Topic/SenderCount/HourBucket/ActionItem/Priority/AnalyzeResult`와 일치. `TopicList`/`ActionItemList`의 `fallback`은 `Report`에서 `analysisError ?? "…"`로 항상 string 전달(옵셔널 아님). `SummaryCard`의 mock 감지는 `summary.includes("모의(mock)")`로 `lib/analyze.ts`의 실제 마커와 일치.
- **그래이스풀 디그레이데이션 보존:** `analysis` null → 각 섹션 `analysisError` Notice 폴백, `warnings` 배너, `truncated` 안내 모두 유지.
