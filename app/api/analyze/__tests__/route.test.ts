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

  it("CSV가 아닌 파일은 400", async () => {
    const fd = new FormData();
    fd.append("file", new File(["hello"], "notes.txt", { type: "text/plain" }));

    const res = await POST(postReq(fd));

    expect(res.status).toBe(400);
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
});
