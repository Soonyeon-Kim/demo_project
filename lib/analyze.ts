import OpenAI from "openai";
import type { Message, Analysis } from "./types";

// 토큰/비용 보호: LLM에 보낼 전사(transcript) 상한
export const MAX_MESSAGES = 500; // 최근 메시지 수 상한
export const MAX_CHARS = 12000; // 전사 문자 수 상한

export interface AnalyzeOutcome {
  /** 분석 결과 (실패 시 null) */
  analysis: Analysis | null;
  /** null일 때의 사유(안내 메시지) */
  error?: string;
  /** 상한 적용으로 잘렸는지 */
  truncated: boolean;
  /** 실제 전사에 포함된 메시지 수 */
  considered: number;
}

const SYSTEM_PROMPT = [
  "너는 채팅방 방장(커뮤니티 관리자)을 돕는 분석 비서다.",
  "주어진 대화 기록을 읽고 한국어로 다음을 만든다:",
  "1) summary: 기간 동안 무슨 일이 오갔는지 3~5문장 요약.",
  "2) topics: 자주 등장한 주요 화제·이슈 목록(각 title과 detail).",
  "3) actionItems: 방장이 후속 조치해야 할 일(미답변 질문, 요청, 결정 필요 사항 등).",
  "   각 항목은 task(할 일), priority(high|medium|low), context(왜 필요한지 근거)를 포함한다.",
  "추측을 최소화하고 대화에 실제로 나타난 내용에 근거한다.",
].join("\n");

// OpenAI 구조화 출력(strict) 스키마 — Analysis 타입과 일치
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "topics", "actionItems"],
  properties: {
    summary: { type: "string" },
    topics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
        },
      },
    },
    actionItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["task", "priority", "context"],
        properties: {
          task: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          context: { type: "string" },
        },
      },
    },
  },
} as const;

/** 사람 메시지만 골라 전사 텍스트로 만들고, 상한 적용 */
export function buildTranscript(messages: Message[]): {
  text: string;
  truncated: boolean;
  considered: number;
} {
  const human = messages.filter((m) => !m.isSystem);

  let slice = human;
  let truncated = false;
  if (slice.length > MAX_MESSAGES) {
    slice = slice.slice(-MAX_MESSAGES);
    truncated = true;
  }

  let text = slice
    .map((m) => `[${m.rawDate || "?"}] ${m.sender}: ${m.text}`)
    .join("\n");

  if (text.length > MAX_CHARS) {
    text = text.slice(-MAX_CHARS);
    truncated = true;
  }

  return { text, truncated, considered: slice.length };
}

/**
 * 키·네트워크 없이 점검하기 위한 결정론적 mock 분석.
 * 입력 메시지에서 파생(메시지 수·참여자·최다 발신자)하며 summary에 mock 마커를 단다.
 * ANALYZE_MOCK=1일 때 analyzeChat이 OpenAI 대신 이걸 반환한다.
 */
export function buildMockAnalysis(messages: Message[]): Analysis {
  const human = messages.filter((m) => !m.isSystem);
  const counts = new Map<string, number>();
  for (const m of human) counts.set(m.sender, (counts.get(m.sender) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const topSender = ranked[0]?.[0] ?? "(없음)";
  const topCount = ranked[0]?.[1] ?? 0;
  const participants = counts.size;
  const total = human.length;

  return {
    summary:
      `⚠️ 모의(mock) 분석 결과입니다 — 실제 LLM 호출 없이 생성되었습니다. ` +
      `분석 대상 메시지 ${total}개, 참여자 ${participants}명. ` +
      `가장 활발한 참여자는 '${topSender}'(${topCount}건)입니다. ` +
      `OPENAI_API_KEY 없이 /api/analyze 파이프라인과 화면을 점검하기 위한 고정 출력입니다.`,
    topics: [
      { title: "가장 활발한 참여자", detail: `${topSender} — ${topCount}건으로 대화를 주도했습니다. (mock)` },
      { title: "메시지 분량", detail: `총 ${total}개 메시지, 참여자 ${participants}명 규모의 대화입니다. (mock)` },
    ],
    actionItems: [
      {
        task: "실제 분석을 보려면 OPENAI_API_KEY를 설정하세요.",
        priority: "high",
        context: "현재 ANALYZE_MOCK=1 모의 모드라 LLM 분석이 비활성화되어 있습니다.",
      },
      {
        task: `'${topSender}'의 기여를 살펴보세요.`,
        priority: "medium",
        context: "가장 메시지가 많은 참여자입니다. (mock 데모용 항목)",
      },
      {
        task: "요약·토픽·액션아이템·우선순위 뱃지가 정상 렌더되는지 확인하세요.",
        priority: "low",
        context: "화면 표시를 점검하는 mock 항목입니다.",
      },
    ],
  };
}

/** OpenAI를 호출해 요약·토픽·액션아이템 생성. 키가 없거나 실패하면 error로 안내 */
export async function analyzeChat(messages: Message[]): Promise<AnalyzeOutcome> {
  const { text, truncated, considered } = buildTranscript(messages);

  // 키/네트워크 없이 파이프라인·UI 점검용. 키 체크보다 먼저 — 플래그가 우선한다.
  if (process.env.ANALYZE_MOCK === "1") {
    return { analysis: buildMockAnalysis(messages), truncated, considered };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      analysis: null,
      error: "OpenAI API 키가 설정되지 않았습니다 (.env의 OPENAI_API_KEY 확인).",
      truncated,
      considered,
    };
  }
  if (!text.trim()) {
    return { analysis: null, error: "분석할 사람 메시지가 없습니다.", truncated, considered };
  }

  try {
    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `다음은 채팅방 대화 기록입니다. 분석해 주세요.\n\n${text}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "chat_analysis", strict: true, schema: SCHEMA },
      },
    });

    const choice = completion.choices[0];
    if (choice.finish_reason === "length") {
      return {
        analysis: null,
        error: "분석 응답이 잘렸습니다. 메시지 양을 줄이거나 모델을 변경해 보세요.",
        truncated,
        considered,
      };
    }

    const message = choice.message;
    if (message.refusal) {
      return { analysis: null, error: `모델이 분석을 거절했습니다: ${message.refusal}`, truncated, considered };
    }
    if (!message.content) {
      return { analysis: null, error: "분석 응답이 비어 있습니다.", truncated, considered };
    }

    const analysis = JSON.parse(message.content) as Analysis;
    return { analysis, truncated, considered };
  } catch (e) {
    const m = e instanceof Error ? e.message : "알 수 없는 오류";
    return { analysis: null, error: `OpenAI 호출 실패: ${m}`, truncated, considered };
  }
}
