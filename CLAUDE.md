# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Next.js version caveat

This project runs **Next.js 16.4 / React 19.3**, newer than most training data. Before writing Next.js code, read the version-matched docs bundled at `node_modules/next/dist/docs/` (`01-app/` covers the App Router: getting-started, guides, api-reference). `AGENTS.md` is managed by `next dev`, which re-adds its block if removed — commit it rather than deleting it.

## Commands

- `npm run dev` — dev server on http://localhost:3000 (Turbopack)
- `npm run build` — production build (also type-checks)
- `npm run start` — serve the production build
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)
- `npm test` — Vitest (`*.test.ts` next to the code; `vitest.config.ts` mirrors the `@/*` alias). Vitest is pinned to `~4.0.18`: 4.1.12 triggers an npm bug (`Cannot read properties of null (reading 'edgesOut')`) on install.
- `npm run test:gemini` — `*.gemini.test.ts` only (`vitest.gemini.config.ts`, excluded from `npm test`): calls the real Gemini with `.env.local`, ~20 s and real quota per run; the model is non-deterministic, so the full responses are logged.

## Architecture

Fresh `create-next-app` scaffold using the App Router only (`app/`, no `pages/` or `src/`). Path alias `@/*` maps to the repo root.

`next.config.ts` enables features that change how pages must be written — check the docs before adding data fetching or links:

- `cacheComponents: true` — Cache Components model (`"use cache"`, prerendered static shells with dynamic holes). See `01-app/01-getting-started/08-caching.md`; the older caching APIs/route-segment configs from Next 14/15 don't apply.
- `partialPrefetching: true` — `<Link>` prefetches only a route's App Shell by default; use `<Link prefetch={true}>` for URL-specific content. See `01-app/02-guides/adopting-partial-prefetching.md`.
- `experimental.agentFeedback: true` — `next dev` may add an agent-feedback section to `AGENTS.md` (see `01-app/02-guides/ai-agents.md`).
- Tailwind CSS v4 is wired through Turbopack via the `@tailwindcss/turbopack` loader for `*.css` (no `tailwind.config` / PostCSS config). Theme tokens live in `app/globals.css` under `@theme inline`, with light/dark CSS variables on `:root`.

`app/layout.tsx` uses the globally available `LayoutProps<"/">` type (generated route types) and loads Geist fonts via `next/font/google` as CSS variables.

## Assistant

The user describes a need in plain language; Gemini (`@google/genai`) picks parts **from the catalogue only**; the server validates the choice and computes the quote. The model is never trusted for ids, compatibility or prices.

- Model output is forced to JSON by a schema: a required `intention` (`devis` | `question` | `non_couvert` | `hors_sujet`), chosen parts (`id`, `quantite`, `raison`), an optional `question` when information is missing, a `message`, `nonCouvert` (needs the catalogue doesn't cover) and `criteresDeduits` (bike criteria read from the message, e.g. "28 pouces" → `700c`, "650b" → `27.5`).
- When the request carries criteria, the model only sees `filtrerPieces(catalogue, criteres)` (instructions and the schema's id enum), so a missing part clearly means "not covered for this bike"; the instructions name the filtering criteria (`decrireCriteres`) so the model says "no chain for a 10-speed bike", not "no chains". Deduced criteria are not used for this pre-filter, only for the server-side check afterwards.
- The server checks `intention` against the content once the quote is computed (`estCoherente`): `question` needs a question, `devis` needs at least one *retained* part, `non_couvert` needs `nonCouvert`. An incoherent, missing or unknown intention is never returned as is: it becomes `question`, the model's `message` is kept, and `question` falls back to `QUESTION_PAR_DEFAUT` — the user always gets something to answer.
- `lib/criteres.ts`: `validerCriteres` checks criteria received as JSON (any unknown value → 400, unlike the URL parser which ignores it); `fusionnerCriteres` lets user-supplied criteria win over deduced ones and returns the deductions actually used, which are sent back to the UI so the user can see and correct them.
- `lib/devis.ts`: `etablirDevis` is the only place prices are computed (integer cents, from `data/pieces.json`). It drops unknown ids, merges duplicates (quantity capped at `QUANTITE_MAX`), and moves parts that are incompatible with the effective criteria, or have an invalid quantity, to `ecartees` with a reason.
- `lib/assistant.ts`: model instructions, JSON schema, `interrogerModele` (Gemini call, 25 s timeout, Gemini 429 → `quota_depasse`, Gemini 503 → `service_indisponible`) and `lireReponse` (checks the model output's shape). Needs `GEMINI_API_KEY` (`.env.local`); `GEMINI_MODEL` overrides the default `gemini-flash-lite-latest` (`gemini-flash-latest` was repeatedly 503 "high demand" in October 2026). The SDK does not retry unless `retryOptions` is passed — keep it that way to save quota.
- `app/api/assistant/route.ts`: `POST { message, criteres?, echanges? }`. The route keeps no history: to answer a question, the client resends the initial `message` plus `echanges: [{ question, reponse }]` (at most `MAX_ECHANGES` = 3; the server formats them into the prompt after the request). Order: rate limit (`lib/limiteur.ts`, 10 req/min per IP, in memory) → body validation (400, including malformed `echanges` or too many; message, question or answer > 1000 chars → 413) → model → `fusionnerCriteres` → `etablirDevis` → `estCoherente`. Success returns `{ intention, message, question, lignes, totalCentimes, nonCouvert, ecartees, criteres, criteresDeduits }`; errors return `{ erreur: { code, message } }` (429 + `Retry-After`, 503 quota or model unavailable, 502 invalid output, 504 timeout, 500).
- Tests (`app/api/assistant/route.test.ts`) never call Gemini: `vi.mock("@google/genai")` replaces only `GoogleGenAI` (real `ApiError` kept), and each test uses its own `x-forwarded-for` IP so the rate limit doesn't couple tests.
