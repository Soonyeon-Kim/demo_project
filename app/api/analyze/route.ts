import { parseChat } from "@/lib/parseChat";
import { parseKakao } from "@/lib/parseKakao";
import { computeStats } from "@/lib/stats";
import { analyzeChat } from "@/lib/analyze";
import type { AnalyzeResult } from "@/lib/types";

// OpenAI SDK는 Node 런타임 필요 (Edge 아님)
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "업로드할 파일이 필요합니다." }, { status: 400 });
  }
  const name = file.name.toLowerCase();
  const isTxt = name.endsWith(".txt");
  if (!name.endsWith(".csv") && !isTxt) {
    return Response.json(
      { error: "CSV 또는 카카오톡 내보내기(.txt) 파일만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  const content = await file.text();
  const { messages, skipped } = isTxt ? parseKakao(content) : parseChat(content);

  if (messages.length === 0) {
    return Response.json(
      { error: "유효한 메시지를 찾지 못했습니다. CSV 형식(Date, User, Message)을 확인하세요." },
      { status: 400 },
    );
  }

  const stats = computeStats(messages);
  const outcome = await analyzeChat(messages);

  const warnings: string[] = [];
  if (skipped > 0) warnings.push(`${skipped}개 행을 건너뛰었습니다(필수 필드 누락).`);

  const result: AnalyzeResult = {
    stats,
    analysis: outcome.analysis,
    analysisError: outcome.error,
    warnings,
    truncated: outcome.truncated,
    consideredMessages: outcome.considered,
  };

  return Response.json(result);
}
