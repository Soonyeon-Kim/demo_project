import { describe, it, expect } from "vitest";
import { buildTranscript, analyzeChat, MAX_MESSAGES } from "../analyze";
import type { Message } from "../types";

function msg(partial: Partial<Message>): Message {
  return {
    timestamp: null,
    rawDate: "2025-05-10 09:00",
    sender: "minji",
    text: "안녕하세요",
    isSystem: false,
    ...partial,
  };
}

describe("buildTranscript", () => {
  it("시스템 메시지를 전사에서 제외한다", () => {
    const { text } = buildTranscript([
      msg({ sender: "minji", text: "사람 메시지" }),
      msg({ sender: "bot", text: "봇 메시지", isSystem: true }),
    ]);

    expect(text).toContain("사람 메시지");
    expect(text).not.toContain("봇 메시지");
  });

  it("발신자와 본문을 한 줄로 합친다", () => {
    const { text } = buildTranscript([msg({ sender: "jaeha", text: "자료 올렸어요" })]);
    expect(text).toContain("jaeha");
    expect(text).toContain("자료 올렸어요");
  });

  it("메시지 수가 상한을 넘으면 최근 것만 남기고 truncated=true", () => {
    const many: Message[] = Array.from({ length: MAX_MESSAGES + 5 }, (_, i) =>
      msg({ text: `메시지${i}` }),
    );

    const { considered, truncated } = buildTranscript(many);

    expect(considered).toBe(MAX_MESSAGES);
    expect(truncated).toBe(true);
  });
});

describe("analyzeChat", () => {
  it("API 키가 없으면 네트워크 호출 없이 안내 에러를 반환한다", async () => {
    const original = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "";
    try {
      const result = await analyzeChat([msg({ text: "회의 언제 하나요" })]);
      expect(result.analysis).toBeNull();
      expect(result.error).toContain("키");
    } finally {
      process.env.OPENAI_API_KEY = original;
    }
  });
});
