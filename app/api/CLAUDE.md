# CLAUDE.md — Analyze API & OpenAI integration

Guidance for the server-side analysis endpoint and its OpenAI call. See the root `CLAUDE.md` for the overall architecture; this file covers everything under `app/api/` plus `lib/analyze.ts` (the OpenAI logic the route orchestrates).

## The endpoint (`app/api/analyze/route.ts`)

`POST /api/analyze`, multipart form with a single `file` field.

- **Forced to `runtime = "nodejs"`** — the OpenAI SDK can't run on the Edge runtime. Don't remove this.
- **Dispatch by extension**: `.txt` → `parseKakao`, `.csv` → `parseChat`. Anything else is rejected. Both parsers return the shared `Message[]`.
- **Validation returns 400** for: no file / not a `File`, unsupported extension, and zero parsed messages. Parser `skipped` counts surface as non-fatal `warnings`, not errors.
- Response is a single `AnalyzeResult` (see `lib/types.ts`): `stats` is always present; `analysis` may be `null` (see graceful degradation).

## OpenAI integration (`lib/analyze.ts`)

- **Structured output, `strict: true` json_schema.** The `SCHEMA` constant **must stay in lockstep with the `Analysis` interface in `lib/types.ts`** — a mismatch is a runtime failure, not a type error. Change both together.
- **The system prompt is Korean and defines the output shape** (`summary`, `topics[]`, `actionItems[]` with `priority` ∈ high/medium/low). Output is Korean by design.
- **Model** comes from `OPENAI_MODEL` (default `gpt-4o-mini`). `OPENAI_API_KEY` is read here and *only* server-side — never expose it to the client.

### Token/cost guard (`buildTranscript`)

Input is capped at `MAX_MESSAGES` (500, most recent) and `MAX_CHARS` (12000); exceeding either sets `truncated: true`. **Don't remove these caps** — raising them raises per-request cost and risks `finish_reason === "length"` failures. System/bot messages are filtered out of the transcript before capping.

### Graceful degradation — preserve this

Every failure path returns `analysis: null` with a Korean `analysisError` string while **still returning `stats`**, so the app is fully usable without a key. The paths: missing `OPENAI_API_KEY`, empty transcript, `finish_reason === "length"`, model `refusal`, empty content, or any thrown SDK error. Add new failure modes the same way — never throw out of `analyzeChat`.

## Testing the route without network

To exercise the route/analyze code without hitting OpenAI, set `process.env.OPENAI_API_KEY = ""` and restore it in a `finally` — this drives the no-key degradation path so only deterministic `stats` are asserted. See `app/api/analyze/__tests__/route.test.ts`.
