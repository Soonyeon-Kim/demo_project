// 앱 전반에서 공유하는 타입 정의

/** 채팅 메시지 한 줄 */
export interface Message {
  /** 파싱된 시각 (파싱 실패 시 null) */
  timestamp: Date | null;
  /** 원본 날짜 문자열 (LLM 전사용) */
  rawDate: string;
  /** 보낸 사람 */
  sender: string;
  /** 메시지 본문 */
  text: string;
  /** 봇/시스템 계정 여부 (분석·활동순위에서 제외) */
  isSystem: boolean;
}

export interface SenderCount {
  sender: string;
  count: number;
}

export interface HourBucket {
  hour: number; // 0..23
  count: number;
}

/** 결정론적으로 계산되는 활동 통계 (LLM 불필요) */
export interface Stats {
  totalMessages: number; // 사람 메시지 수 (시스템 제외)
  totalSystemMessages: number; // 봇/시스템 메시지 수
  participants: number; // 고유 사람 발신자 수
  periodStart: string | null; // 표시용 문자열
  periodEnd: string | null;
  topSenders: SenderCount[]; // 메시지 수 내림차순 (사람만)
  hourly: HourBucket[]; // 0..23시 분포 (사람만)
}

export interface Topic {
  title: string;
  detail: string;
}

export type Priority = "high" | "medium" | "low";

export interface ActionItem {
  task: string;
  priority: Priority;
  context: string;
}

/** OpenAI가 생성하는 분석 결과 (구조화 출력 스키마와 일치) */
export interface Analysis {
  summary: string;
  topics: Topic[];
  actionItems: ActionItem[];
}

/** /api/analyze 응답 */
export interface AnalyzeResult {
  stats: Stats;
  /** null이면 분석 불가(키 없음/에러) — analysisError에 사유 */
  analysis: Analysis | null;
  analysisError?: string;
  /** 파싱 스킵 등 비치명적 경고 */
  warnings: string[];
  /** transcript가 상한으로 잘렸는지 */
  truncated: boolean;
  /** LLM에 실제로 보낸 메시지 수 */
  consideredMessages: number;
}
