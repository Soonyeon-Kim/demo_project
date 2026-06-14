import { describe, it, expect } from "vitest";
import { buildTranscript, analyzeChat, buildMockAnalysis, MAX_MESSAGES } from "../analyze";
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
    const originalMock = process.env.ANALYZE_MOCK;
    process.env.OPENAI_API_KEY = "";
    delete process.env.ANALYZE_MOCK; // mock 플래그가 켜져 있으면 이 경로를 안 타므로 끈다
    try {
      const result = await analyzeChat([msg({ text: "회의 언제 하나요" })]);
      expect(result.analysis).toBeNull();
      expect(result.error).toContain("키");
    } finally {
      process.env.OPENAI_API_KEY = original;
      process.env.ANALYZE_MOCK = originalMock;
    }
  });

  it("ANALYZE_MOCK=1이면 키 없이도 네트워크 호출 없이 mock 분석을 반환한다", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    const originalMock = process.env.ANALYZE_MOCK;
    process.env.OPENAI_API_KEY = "";
    process.env.ANALYZE_MOCK = "1";
    try {
      const result = await analyzeChat([msg({ sender: "minji", text: "안녕하세요" })]);
      expect(result.analysis).not.toBeNull();
      expect(result.error).toBeUndefined();
      expect(result.analysis?.summary.toLowerCase()).toContain("mock");
      expect(result.analysis?.actionItems.length).toBeGreaterThan(0);
    } finally {
      process.env.OPENAI_API_KEY = originalKey;
      process.env.ANALYZE_MOCK = originalMock;
    }
  });
});

describe("buildMockAnalysis", () => {
  it("입력에서 파생한 결정론적 Analysis를 만든다 (마커·우세 발신자·메시지 수 반영)", () => {
    const messages: Message[] = [
      msg({ sender: "minji", text: "a" }),
      msg({ sender: "minji", text: "b" }),
      msg({ sender: "jaeha", text: "c" }),
      msg({ sender: "bot", text: "시스템", isSystem: true }),
    ];

    const a = buildMockAnalysis(messages);

    // 마커
    expect(a.summary.toLowerCase()).toContain("mock");
    // 사람 메시지 3개·참여자 2명 반영 (시스템 제외)
    expect(a.summary).toContain("3");
    expect(a.summary).toContain("2");
    // 최다 발신자(minji)가 토픽 어딘가에 등장
    expect(a.topics.some((t) => t.detail.includes("minji") || t.title.includes("minji"))).toBe(true);
    // 결정론: 동일 입력 → 동일 출력
    expect(buildMockAnalysis(messages)).toEqual(a);
  });

  it("actionItems가 Analysis 계약을 지키고 high/medium/low 우선순위를 모두 포함한다", () => {
    const a = buildMockAnalysis([msg({ sender: "x", text: "t" })]);

    expect(a.topics.length).toBeGreaterThan(0);
    expect(a.actionItems.length).toBeGreaterThan(0);
    for (const item of a.actionItems) {
      expect(item.task.length).toBeGreaterThan(0);
      expect(["high", "medium", "low"]).toContain(item.priority);
    }
    const priorities = a.actionItems.map((i) => i.priority);
    expect(priorities).toEqual(expect.arrayContaining(["high", "medium", "low"]));
  });

  it("사람 메시지가 없어도 안전하게 생성한다", () => {
    const a = buildMockAnalysis([msg({ sender: "bot", text: "시스템", isSystem: true })]);
    expect(a.summary.toLowerCase()).toContain("mock");
    expect(a.summary).toContain("0"); // 메시지 0개
  });
});
