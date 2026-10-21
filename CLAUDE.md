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

No test framework is configured yet.

## Architecture

Fresh `create-next-app` scaffold using the App Router only (`app/`, no `pages/` or `src/`). Path alias `@/*` maps to the repo root.

`next.config.ts` enables features that change how pages must be written — check the docs before adding data fetching or links:

- `cacheComponents: true` — Cache Components model (`"use cache"`, prerendered static shells with dynamic holes). See `01-app/01-getting-started/08-caching.md`; the older caching APIs/route-segment configs from Next 14/15 don't apply.
- `partialPrefetching: true` — `<Link>` prefetches only a route's App Shell by default; use `<Link prefetch={true}>` for URL-specific content. See `01-app/02-guides/adopting-partial-prefetching.md`.
- `experimental.agentFeedback: true` — `next dev` may add an agent-feedback section to `AGENTS.md` (see `01-app/02-guides/ai-agents.md`).
- Tailwind CSS v4 is wired through Turbopack via the `@tailwindcss/turbopack` loader for `*.css` (no `tailwind.config` / PostCSS config). Theme tokens live in `app/globals.css` under `@theme inline`, with light/dark CSS variables on `:root`.

`app/layout.tsx` uses the globally available `LayoutProps<"/">` type (generated route types) and loads Geist fonts via `next/font/google` as CSS variables.
