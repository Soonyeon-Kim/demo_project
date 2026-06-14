import { describe, it, expect } from "vitest";
import { POST } from "../route";

function postReq(formData: FormData): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/analyze (입력 검증)", () => {
  it("파일이 없으면 400", async () => {
    const res = await POST(postReq(new FormData()));
    expect(res.status).toBe(400);
  });

  it("지원하지 않는 확장자(.pdf 등)는 확장자 거부로 400", async () => {
    const fd = new FormData();
    fd.append("file", new File(["hello"], "report.pdf", { type: "application/pdf" }));

    const res = await POST(postReq(fd));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("CSV"); // 0-메시지 경로가 아닌 확장자 거부 경로임을 고정
  });

  it("유효한 메시지가 없는 CSV는 400", async () => {
    const fd = new FormData();
    fd.append("file", new File(["Date,User,Message\n"], "empty.csv", { type: "text/csv" }));

    const res = await POST(postReq(fd));

    expect(res.status).toBe(400);
  });

  it("카카오톡 .txt 업로드를 인식해 통계를 반환한다", async () => {
    const original = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = ""; // 네트워크 호출 없이 통계만 검증
    try {
      const txt = [
        "--------------- 2026년 5월 24일 일요일 ---------------",
        "[차라] [오전 3:03] 자료 공유 가능할까요?",
        "[부경대] [오후 12:45] 안녕하세요",
      ].join("\n");
      const fd = new FormData();
      fd.append("file", new File([txt], "KakaoTalk.txt", { type: "text/plain" }));

      const res = await POST(postReq(fd));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.stats.totalMessages).toBe(2);
      expect(data.stats.participants).toBe(2);
    } finally {
      process.env.OPENAI_API_KEY = original;
    }
  });

  it("ANALYZE_MOCK=1이면 키 없이도 analysis가 채워져 반환된다", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    const originalMock = process.env.ANALYZE_MOCK;
    process.env.OPENAI_API_KEY = "";
    process.env.ANALYZE_MOCK = "1";
    try {
      const txt = [
        "--------------- 2026년 5월 24일 일요일 ---------------",
        "[차라] [오전 3:03] 자료 공유 가능할까요?",
        "[부경대] [오후 12:45] 안녕하세요",
      ].join("\n");
      const fd = new FormData();
      fd.append("file", new File([txt], "KakaoTalk.txt", { type: "text/plain" }));

      const res = await POST(postReq(fd));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.analysis).not.toBeNull();
      expect(typeof data.analysis.summary).toBe("string");
      expect(Array.isArray(data.analysis.topics)).toBe(true);
      expect(Array.isArray(data.analysis.actionItems)).toBe(true);
    } finally {
      process.env.OPENAI_API_KEY = originalKey;
      process.env.ANALYZE_MOCK = originalMock;
    }
  });
});
