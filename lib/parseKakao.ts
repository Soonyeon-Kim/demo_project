import type { Message } from "./types";
import type { ParseResult } from "./parseChat";

// 카카오톡 PC 내보내기(.txt) → 우리 표준 메시지 배열로 변환.
// 형식:
//   --------------- 2026년 5월 24일 일요일 ---------------   (날짜 구분선)
//   [보낸사람] [오전/오후 H:MM] 메시지                        (메시지 헤더)
//   헤더 없는 다음 줄(빈 줄 포함) = 직전 메시지의 연속
//   "○○님이 들어왔습니다./나갔습니다.", "메시지가 삭제되었습니다." = 시스템 줄(제외)

const DATE_SEP = /^-+\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*-+$/;
const HEADER = /^\[([^\]]+)\]\s*\[(오전|오후)\s*(\d{1,2}):(\d{2})\]\s?(.*)$/;
const JOIN_LEAVE = /.+님이 (들어왔습니다|나갔습니다)\.$/;
const DELETED = "메시지가 삭제되었습니다.";

const p2 = (n: number) => String(n).padStart(2, "0");

/** 오전/오후 + 12시간 시각 → 24시간 시각 */
function to24(ampm: string, h: number): number {
  if (ampm === "오전") return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

interface Draft {
  sender: string;
  rawDate: string; // "YYYY-MM-DD HH:MM"
  lines: string[];
}

export function parseKakao(txt: string): ParseResult {
  const messages: Message[] = [];
  let skipped = 0;

  let curDate: { y: number; m: number; d: number } | null = null;
  let draft: Draft | null = null;

  const flush = () => {
    if (!draft) return;
    const text = draft.lines.join("\n").trim();
    if (text) {
      messages.push({
        timestamp: new Date(draft.rawDate.replace(" ", "T")),
        rawDate: draft.rawDate,
        sender: draft.sender,
        text,
        isSystem: false,
      });
    } else {
      skipped++; // 본문이 빈 메시지는 버림
    }
    draft = null;
  };

  for (const line of txt.split(/\r?\n/)) {
    const trimmed = line.trim();

    // 1) 날짜 구분선 → 현재 날짜 갱신
    const sep = trimmed.match(DATE_SEP);
    if (sep) {
      flush();
      curDate = { y: +sep[1], m: +sep[2], d: +sep[3] };
      continue;
    }

    // 2) 메시지 헤더 → 새 메시지 시작
    const head = trimmed.match(HEADER);
    if (head && curDate) {
      flush();
      const [, sender, ampm, hh, mm, first] = head;
      const hour = to24(ampm, +hh);
      const rawDate = `${curDate.y}-${p2(curDate.m)}-${p2(curDate.d)} ${p2(hour)}:${p2(+mm)}`;
      draft = { sender: sender.trim(), rawDate, lines: [first] };
      continue;
    }

    // 3) 시스템 줄(입장/퇴장/삭제) → 메시지 아님, 누적 종료 후 건너뜀
    if (JOIN_LEAVE.test(trimmed) || trimmed === DELETED) {
      flush();
      continue;
    }

    // 4) 그 외 → 직전 메시지의 연속 줄(빈 줄 포함). 메시지 이전이면 무시.
    if (draft) draft.lines.push(line);
  }

  flush();
  return { messages, skipped };
}
