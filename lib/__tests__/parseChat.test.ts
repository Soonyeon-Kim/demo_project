import { describe, it, expect } from "vitest";
import { parseChat, SYSTEM_USERS } from "../parseChat";

describe("parseChat", () => {
  it("Date/User/Message 행을 메시지로 파싱한다", () => {
    const csv = [
      "Date,User,Message",
      "2025-05-10 09:12,minji,오늘 5시 회의 회의실 B 맞죠?",
      "2025-05-10 09:13,jaeha,네 맞아요",
    ].join("\n");

    const { messages, skipped } = parseChat(csv);

    expect(skipped).toBe(0);
    expect(messages).toHaveLength(2);
    expect(messages[0].sender).toBe("minji");
    expect(messages[0].text).toBe("오늘 5시 회의 회의실 B 맞죠?");
    expect(messages[0].timestamp).toBeInstanceOf(Date);
    expect(messages[0].isSystem).toBe(false);
  });

  it("봇/시스템 계정은 isSystem=true로 표시한다", () => {
    const csv = "Date,User,Message\n2025-05-10 10:30,bot,새 멤버님이 들어왔습니다";

    const { messages } = parseChat(csv);

    expect(messages[0].isSystem).toBe(true);
    expect(SYSTEM_USERS).toContain("bot");
  });

  it("따옴표로 감싼 쉼표·줄바꿈 포함 메시지를 처리한다", () => {
    const csv = 'Date,User,Message\n2025-05-10 09:20,minji,"안녕, 여러분\n오늘 회의 있어요"';

    const { messages, skipped } = parseChat(csv);

    expect(skipped).toBe(0);
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toContain("안녕, 여러분");
    expect(messages[0].text).toContain("오늘 회의 있어요");
  });

  it("보낸사람 또는 본문이 빈 행은 건너뛴다", () => {
    const csv = [
      "Date,User,Message",
      "2025-05-10 09:12,minji,안녕하세요",
      "2025-05-10 09:13,,보낸사람 없음",
      "2025-05-10 09:14,seho,",
    ].join("\n");

    const { messages, skipped } = parseChat(csv);

    expect(messages).toHaveLength(1);
    expect(skipped).toBe(2);
  });

  it("파싱 불가한 날짜는 timestamp=null이지만 메시지는 유지한다", () => {
    const csv = "Date,User,Message\nnot-a-date,minji,여전히 유효한 메시지";

    const { messages } = parseChat(csv);

    expect(messages).toHaveLength(1);
    expect(messages[0].timestamp).toBeNull();
  });
});
