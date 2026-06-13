"use client";

import { useState } from "react";
import type { AnalyzeResult, Priority, SenderCount, HourBucket } from "@/lib/types";

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
        <h1 className="text-2xl font-bold">채팅방 분석</h1>
        <p className="mt-1 text-sm text-gray-500">
          채팅 CSV(<code>Date, User, Message</code>) 또는 카카오톡 내보내기(<code>.txt</code>)를
          올리면 요약·토픽·활동 통계·액션 아이템을 만들어 드립니다.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mb-8 flex flex-col gap-3 rounded-xl border border-gray-200 p-5 sm:flex-row sm:items-center"
      >
        <input
          type="file"
          accept=".csv,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-white hover:file:bg-gray-700"
        />
        <button
          type="submit"
          disabled={!file || loading}
          className="shrink-0 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
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

function Report({ result }: { result: AnalyzeResult }) {
  const { stats, analysis, analysisError, warnings, truncated } = result;

  return (
    <div className="flex flex-col gap-8">
      {warnings.length > 0 && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warnings.map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </div>
      )}

      {/* 1. 전체 요약 */}
      <Section title="전체 요약">
        {analysis ? (
          <p className="whitespace-pre-wrap leading-relaxed text-gray-800">{analysis.summary}</p>
        ) : (
          <Notice text={analysisError ?? "요약을 생성하지 못했습니다."} />
        )}
        {truncated && (
          <p className="mt-2 text-xs text-gray-400">
            ※ 메시지가 많아 가장 최근 메시지 위주로 분석했습니다.
          </p>
        )}
      </Section>

      {/* 2. 주요 토픽/이슈 */}
      <Section title="주요 토픽 · 이슈">
        {analysis && analysis.topics.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {analysis.topics.map((t, i) => (
              <li key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="font-medium text-gray-900">{t.title}</div>
                <div className="mt-0.5 text-sm text-gray-600">{t.detail}</div>
              </li>
            ))}
          </ul>
        ) : (
          <Notice text={analysisError ?? "토픽이 없습니다."} />
        )}
      </Section>

      {/* 3. 활동 통계 (LLM 없이 계산) */}
      <Section title="활동 통계">
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="메시지" value={stats.totalMessages} />
          <Kpi label="참여자" value={stats.participants} />
          <Kpi label="시스템 메시지" value={stats.totalSystemMessages} />
          <Kpi
            label="기간"
            value={stats.periodStart ? days(stats.periodStart, stats.periodEnd) : "—"}
          />
        </div>

        {stats.periodStart && (
          <p className="mb-5 text-xs text-gray-400">
            {stats.periodStart} ~ {stats.periodEnd}
          </p>
        )}

        <h3 className="mb-2 text-sm font-semibold text-gray-700">활동 멤버</h3>
        <SenderBars senders={stats.topSenders} />

        <h3 className="mb-2 mt-6 text-sm font-semibold text-gray-700">시간대별 메시지</h3>
        <HourlyBars hourly={stats.hourly} />
      </Section>

      {/* 4. 액션 아이템 */}
      <Section title="액션 아이템">
        {analysis && analysis.actionItems.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {analysis.actionItems.map((a, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
                <PriorityBadge priority={a.priority} />
                <div>
                  <div className="font-medium text-gray-900">{a.task}</div>
                  <div className="mt-0.5 text-sm text-gray-500">{a.context}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Notice text={analysisError ?? "액션 아이템이 없습니다."} />
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 border-b border-gray-200 pb-1 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Notice({ text }: { text: string }) {
  return <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500">{text}</p>;
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3 text-center">
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{label}</div>
    </div>
  );
}

function SenderBars({ senders }: { senders: SenderCount[] }) {
  if (senders.length === 0) return <Notice text="표시할 데이터가 없습니다." />;
  const max = senders[0].count;
  return (
    <div className="flex flex-col gap-1.5">
      {senders.slice(0, 10).map((s) => (
        <div key={s.sender} className="flex items-center gap-2 text-sm">
          <div className="w-24 shrink-0 truncate text-right text-gray-600">{s.sender}</div>
          <div className="h-4 flex-1 rounded bg-gray-100">
            <div
              className="h-4 rounded bg-blue-500"
              style={{ width: `${Math.max(4, (s.count / max) * 100)}%` }}
            />
          </div>
          <div className="w-8 shrink-0 text-gray-500">{s.count}</div>
        </div>
      ))}
    </div>
  );
}

function HourlyBars({ hourly }: { hourly: HourBucket[] }) {
  const max = Math.max(1, ...hourly.map((h) => h.count));
  return (
    <div className="flex h-24 items-end gap-0.5">
      {hourly.map((h) => (
        <div
          key={h.hour}
          className="flex flex-1 flex-col items-center justify-end"
          title={`${h.hour}시: ${h.count}건`}
        >
          <div
            className="w-full rounded-t bg-blue-400"
            style={{ height: `${(h.count / max) * 100}%` }}
          />
          {h.hour % 6 === 0 && <span className="mt-1 text-[10px] text-gray-400">{h.hour}</span>}
        </div>
      ))}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, { label: string; cls: string }> = {
    high: { label: "높음", cls: "bg-red-100 text-red-700" },
    medium: { label: "보통", cls: "bg-amber-100 text-amber-700" },
    low: { label: "낮음", cls: "bg-gray-100 text-gray-600" },
  };
  const { label, cls } = map[priority];
  return (
    <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

/** 기간 일수 표시용 (start~end 문자열에서 대략 일수 계산) */
function days(start: string, end: string | null): string {
  if (!end) return "1일";
  const s = new Date(start.replace(" ", "T")).getTime();
  const e = new Date(end.replace(" ", "T")).getTime();
  const d = Math.max(1, Math.round((e - s) / 86400000) + 1);
  return `${d}일`;
}
