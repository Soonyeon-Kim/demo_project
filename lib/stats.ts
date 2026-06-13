import type { Message, Stats, SenderCount, HourBucket } from "./types";

/** Date → "YYYY-MM-DD HH:MM" (로컬 시각, 표시용) */
function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 메시지 배열에서 결정론적 활동 통계 계산 (시스템 메시지는 사람 통계에서 제외) */
export function computeStats(messages: Message[]): Stats {
  const human = messages.filter((m) => !m.isSystem);
  const systemCount = messages.length - human.length;

  // 발신자별 카운트 (사람만)
  const counts = new Map<string, number>();
  for (const m of human) counts.set(m.sender, (counts.get(m.sender) ?? 0) + 1);
  const topSenders: SenderCount[] = [...counts.entries()]
    .map(([sender, count]) => ({ sender, count }))
    .sort((a, b) => b.count - a.count);

  // 시간대별 분포 (timestamp 있는 사람 메시지만)
  const hourly: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  for (const m of human) {
    if (m.timestamp) hourly[m.timestamp.getHours()].count++;
  }

  // 기간 (timestamp 있는 모든 메시지 기준)
  const times = messages
    .map((m) => m.timestamp)
    .filter((t): t is Date => t !== null)
    .map((t) => t.getTime());
  const periodStart = times.length ? fmt(new Date(Math.min(...times))) : null;
  const periodEnd = times.length ? fmt(new Date(Math.max(...times))) : null;

  return {
    totalMessages: human.length,
    totalSystemMessages: systemCount,
    participants: counts.size,
    periodStart,
    periodEnd,
    topSenders,
    hourly,
  };
}
