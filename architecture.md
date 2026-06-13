# Architecture

The defining design decision is the **split between deterministic stats and LLM analysis**. Activity statistics are computed in plain JS and always work; the OpenAI call is optional and degrades gracefully. Treat these as two independent pipelines that happen to share an input.

Request flow (`app/api/analyze/route.ts`):

1. Dispatch by file extension — `.txt` → `parseKakao`, `.csv` → `parseChat`. Both produce the same `Message[]`.
2. `computeStats(messages)` — synchronous, no LLM. Sender ranking, hourly distribution, period, participant counts.
3. `analyzeChat(messages)` — async OpenAI call producing summary/topics/action items.
4. Return a single `AnalyzeResult` JSON; `app/page.tsx` (client component) renders it.

**`lib/types.ts` is the contract layer.** The `Message` interface is what every parser must produce and what both stats and analyze consume. To support a new chat-export format, write a parser that returns `Message[]` and add a branch in `route.ts` — nothing downstream changes.

> **The analyze API endpoint and OpenAI integration are documented separately in [`app/api/CLAUDE.md`](app/api/CLAUDE.md)** — read it before touching `app/api/` or `lib/analyze.ts` (structured-output contract, token/cost caps, graceful-degradation behavior, route testing).

## Key invariants to preserve

- **`isSystem` excludes bots/system accounts** from analysis *and* activity ranking. The CSV path flags them via the `SYSTEM_USERS` list in `lib/parseChat.ts`; the KakaoTalk path drops system lines (join/leave/"메시지가 삭제되었습니다") via regex in `lib/parseKakao.ts`. Keep both paths consistent when changing this behavior.

## KakaoTalk parser specifics (`lib/parseKakao.ts`)

State machine over lines: date separators update the current date; `[sender] [오전/오후 H:MM] text` headers start a new message (12h→24h conversion); any other line (including blank) is appended to the previous message (multi-line support). This is the most fragile parsing logic — change the `DATE_SEP`/`HEADER` regexes carefully and lean on `lib/__tests__/parseKakao.test.ts`.
