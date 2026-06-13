import { describe, it, expect } from "vitest";
import { computeStats } from "../stats";
import type { Message } from "../types";

function msg(partial: Partial<Message>): Message {
  return {
    timestamp: null,
    rawDate: "",
    sender: "x",
    text: "t",
    isSystem: false,
    ...partial,
  };
}

describe("computeStats", () => {
  it("시스템 메시지를 제외하고 사람 메시지 수·참여자 수를 센다", () => {
    const messages: Message[] = [
      msg({ sender: "minji" }),
      msg({ sender: "minji" }),
      msg({ sender: "jaeha" }),
      msg({ sender: "bot", isSystem: true }),
    ];

    const stats = computeStats(messages);

    expect(stats.totalMessages).toBe(3);
    expect(stats.totalSystemMessages).toBe(1);
    expect(stats.participants).toBe(2);
  });

  it("활동 멤버 순위를 메시지 수 내림차순으로 매기고 시스템은 제외한다", () => {
    const messages: Message[] = [
      msg({ sender: "minji" }),
      msg({ sender: "minji" }),
      msg({ sender: "jaeha" }),
      msg({ sender: "bot", isSystem: true }),
      msg({ sender: "bot", isSystem: true }),
      msg({ sender: "bot", isSystem: true }),
    ];

    const stats = computeStats(messages);

    expect(stats.topSenders[0]).toEqual({ sender: "minji", count: 2 });
    expect(stats.topSenders.map((s) => s.sender)).not.toContain("bot");
  });

  it("timestamp 기준으로 시간대별 분포를 만든다", () => {
    const messages: Message[] = [
      msg({ sender: "a", timestamp: new Date("2025-05-10T09:12:00") }),
      msg({ sender: "b", timestamp: new Date("2025-05-10T09:50:00") }),
      msg({ sender: "c", timestamp: new Date("2025-05-10T14:00:00") }),
    ];

    const stats = computeStats(messages);

    expect(stats.hourly).toHaveLength(24);
    expect(stats.hourly[9].count).toBe(2);
    expect(stats.hourly[14].count).toBe(1);
  });
});
