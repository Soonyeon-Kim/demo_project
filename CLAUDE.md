# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A chat-room analysis MVP for community admins. Upload a chat export (CSV or KakaoTalk `.txt`) and get back **deterministic activity statistics** plus an **LLM-generated report** (summary, key topics, action items). No database, no auth — one-shot upload → analyze → render. Product output and most code comments are in Korean.

Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4. Analysis engine: OpenAI API (server-side only).

## Commands

```bash
npm run dev          # dev server at http://localhost:3000
npm run build        # production build
npm run lint         # eslint (flat config: eslint.config.mjs)
npm test             # vitest run (one-shot, non-watch)

npx vitest run lib/__tests__/stats.test.ts   # single test file
npx vitest run -t "카카오톡"                  # single test by name pattern
npx vitest                                    # watch mode
```

Runtime config lives in `.env` (gitignored; see `.env.example`): `OPENAI_API_KEY` and optional `OPENAI_MODEL` (defaults to `gpt-4o-mini`). Restart `npm run dev` after editing `.env`.

## Architecture

The high-level architecture — the deterministic-stats vs. LLM-analysis pipeline split, the request flow, the `Message` contract layer, and parser invariants — is documented in **[`architecture.md`](architecture.md)**. Read it before changing data flow, types, or parsers.

@architecture.md

## Conventions

- **Path alias `@/*` maps to the repo root.** It's registered in both `tsconfig.json` and `vitest.config.ts` — update both if it ever changes, or tests will fail to resolve imports.
- Tests live in `__tests__/` next to the code they cover.

## Next.js 16 — read the local docs

This is Next.js **16**, which has breaking changes from earlier versions; your training data may be stale. Before writing or changing Next.js-specific code (App Router APIs, route handlers, config), consult the bundled docs in `node_modules/next/dist/docs/` and heed deprecation notices.
