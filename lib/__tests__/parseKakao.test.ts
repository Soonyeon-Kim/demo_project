import { describe, it, expect } from "vitest";
import { parseKakao } from "../parseKakao";

const SEP = "---------------";

describe("parseKakao", () => {
  it("날짜 구분선과 [보낸사람] [오전/오후 H:MM] 헤더를 파싱한다", () => {
    const txt = [
      "실리콘밸리 ... 님과 카카오톡 대화",
      "저장한 날짜 : 2026-06-13 18:17:31",
      "",
      `${SEP} 2026년 5월 24일 일요일 ${SEP}`,
      "[차라] [오전 3:03] 자료 공유 가능할까요?",
    ].join("\n");

    const { messages } = parseKakao(txt);

    expect(messages).toHaveLength(1);
    expect(messages[0].sender).toBe("차라");
    expect(messages[0].text).toBe("자료 공유 가능할까요?");
    expect(messages[0].rawDate.startsWith("2026-05-24")).toBe(true);
    expect(messages[0].timestamp?.getHours()).toBe(3);
    expect(messages[0].isSystem).toBe(false);
  });

  it("오전/오후를 24시간제로 변환한다 (오전 12→0, 오후 12→12, 오후 1→13)", () => {
    const txt = [
      `${SEP} 2026년 5월 24일 일요일 ${SEP}`,
      "[a] [오전 12:07] 자정",
      "[b] [오후 12:45] 정오",
      "[c] [오후 1:20] 오후한시",
    ].join("\n");

    const { messages } = parseKakao(txt);

    expect(messages[0].timestamp?.getHours()).toBe(0);
    expect(messages[1].timestamp?.getHours()).toBe(12);
    expect(messages[2].timestamp?.getHours()).toBe(13);
  });

  it("헤더 없는 다음 줄(빈 줄 포함)은 직전 메시지에 합친다", () => {
    const txt = [
      `${SEP} 2026년 5월 24일 일요일 ${SEP}`,
      "[부경대] [오후 12:45] 안녕하세요.",
      "강의 듣다보니 질문이 있어요.",
      "",
      "저도 비슷합니다.",
      "[Jae] [오후 1:20] 회사 안에서 돌립니다",
    ].join("\n");

    const { messages } = parseKakao(txt);

    expect(messages).toHaveLength(2);
    expect(messages[0].text).toContain("안녕하세요.");
    expect(messages[0].text).toContain("저도 비슷합니다.");
    expect(messages[1].sender).toBe("Jae");
  });

  it("입장/퇴장/삭제 시스템 줄은 제외하고 직전 메시지에 합치지 않는다", () => {
    const txt = [
      `${SEP} 2026년 5월 24일 일요일 ${SEP}`,
      "부경대/신소재공학님이 들어왔습니다.",
      "[확인] [오후 7:41] 윈도우에서 셋업하면 되나요?",
      "메시지가 삭제되었습니다.",
      "[찹츄] [오후 7:44] 일반 윈도우 환경에서 셋업하세요",
      "페이퍼로지님이 나갔습니다.",
    ].join("\n");

    const { messages } = parseKakao(txt);

    expect(messages).toHaveLength(2);
    expect(messages[0].text).toBe("윈도우에서 셋업하면 되나요?");
    expect(messages[0].text).not.toContain("삭제");
    expect(messages[1].sender).toBe("찹츄");
    expect(messages.every((m) => !m.isSystem)).toBe(true);
  });

  it("첫 메시지 이전의 제목/저장날짜 머리말은 무시한다", () => {
    const txt = [
      "OOO 님과 카카오톡 대화",
      "저장한 날짜 : 2026-06-13 18:17:31",
      "",
      `${SEP} 2026년 5월 24일 일요일 ${SEP}`,
      "[삐] [오후 1:44] 사진",
    ].join("\n");

    const { messages } = parseKakao(txt);

    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe("사진");
  });

  it("여러 날짜 구분선에 걸친 전사를 각 날짜로 분리한다", () => {
    const txt = [
      `${SEP} 2026년 5월 24일 일요일 ${SEP}`,
      "[차라] [오후 11:50] 첫째 날 메시지",
      `${SEP} 2026년 5월 25일 월요일 ${SEP}`,
      "[부경대] [오전 9:10] 둘째 날 메시지",
    ].join("\n");

    const { messages } = parseKakao(txt);

    expect(messages).toHaveLength(2);
    expect(messages[0].rawDate.startsWith("2026-05-24")).toBe(true);
    expect(messages[1].rawDate.startsWith("2026-05-25")).toBe(true);
  });
});
