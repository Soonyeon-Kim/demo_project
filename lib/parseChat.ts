import Papa from "papaparse";
import type { Message } from "./types";

// ── CSV 컬럼명 ──────────────────────────────────────────────
// 다른 채팅 export 형식(카카오톡/디스코드 등)으로 바꿀 때 이 매핑만 수정하면 됨.
const COL = { date: "Date", user: "User", message: "Message" } as const;

// 봇/시스템 계정 — 분석과 활동 멤버 순위에서 제외 (소문자로 비교)
export const SYSTEM_USERS = ["bot"];

export interface ParseResult {
  messages: Message[];
  /** 필수 필드(보낸사람/본문) 누락으로 건너뛴 행 수 */
  skipped: number;
}

/** "YYYY-MM-DD HH:MM" 형태를 Date로 파싱. 실패 시 null */
function parseTimestamp(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw.trim().replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

/** CSV 문자열 → Message[]. 봇 계정은 isSystem=true로 표시 */
export function parseChat(csv: string): ParseResult {
  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const messages: Message[] = [];
  let skipped = 0;

  for (const row of data) {
    const sender = (row[COL.user] ?? "").trim();
    const text = (row[COL.message] ?? "").trim();
    const rawDate = (row[COL.date] ?? "").trim();

    if (!sender || !text) {
      skipped++;
      continue;
    }

    messages.push({
      timestamp: parseTimestamp(rawDate),
      rawDate,
      sender,
      text,
      isSystem: SYSTEM_USERS.includes(sender.toLowerCase()),
    });
  }

  return { messages, skipped };
}
