# AGENTS.md — masjid-tv (Masjid View)

Project rules for the coding agent (Antigravity / Gemini, Claude Code, Cursor, Codex).

## What this is
**Masjid View**: a full-screen web display for masjid/surau TVs (JAKIM prayer times, live clock, azan/iqamah/solat/khutbah screens, announcements) plus a phone admin app for AJK. The TV must keep working offline for weeks.
- Phase 1 = TV display (no backend). Phase 2 = admin app + Supabase backend + TV sync.

## Source of truth
- **Always read `_specs/` before changing behaviour.** `00-PRD.md` (display), `01-theme-contract.md` (theme interface + tokens), `10-PRD-phase2.md` (admin + backend), `11-schema.sql` (database), `02-*-prompts.md` / `12-phase2-prompts.md` (build order).
- If code and spec disagree, the spec wins. If the spec is unclear or contradicts itself, STOP and ask — do not guess.
- `designs/*.dc.html` (TV) and `designs/admin/*.dc.html` (admin) are design-tool source. They do NOT run in a browser. Read markup, inline styles and the script data block. If `designs/ref/*.png` or `designs/admin/ref/*.png` exist, they are screenshots for visual comparison.

## Stack
- Next.js (App Router) + TypeScript (strict) + Tailwind, `output: 'export'` (static; no API routes, no server actions, no middleware).
- Vitest for unit tests.
- Fonts self-hosted via `next/font/google` (must work offline).
- Phase 2: Supabase (Auth, Postgres + RLS, Storage) via `@supabase/supabase-js` in the browser. The only server code allowed is `supabase/functions/*` (Edge Functions) and SQL in `supabase/migrations/*`.
- Hosting: Cloudflare Pages, one domain: `/tv` (display), `/admin` (admin app). Target TV: Google TV + Fully Kiosk Browser, 1920×1080.

## Folder rules (hard)
- `src/core/` — pure TypeScript prayer engine + playlist logic. **No React, no DOM, no styling, no fetch.** Everything time-related goes through the single `now()` in `src/core/time.ts`.
- `src/data/` — prayer API, IndexedDB cache, bundled fallback, Phase 2 bundle sync (`bundle.ts`). No styling.
- `src/themes/<id>/` — styling only. **No prayer logic, no Supabase calls.** Themes receive a `DisplayState` and render it.
- `src/templates/` — template field schemas, validation, sample data, `ayat-sources.json`.
- `src/app/tv/` — the display page that wires engine → theme.
- `src/app/admin/**` — admin pages (client components). `src/admin/` — admin components, hooks, `i18n/ms.json` + `en.json`.
- `src/lib/supabase.ts` — the single Supabase browser client.
- `supabase/migrations/` — SQL migrations; `0001_init.sql` = `_specs/11-schema.sql`. New migrations are numbered and shown to the user before applying.

## Non-negotiables (display)
- Never show guessed or hard-coded prayer times. Read order: IndexedDB → `public/data/{zone}-{year}.json` → "Data waktu tidak tersedia".
- Imsak and Syuruk are markers: no azan, no iqamah, never "SEKARANG" or "SETERUSNYA"; next = next prayer, wrapping to tomorrow's Subuh (PRD §4, changed 2026-10-18).
- Friday Zohor = "Jumaat"; azan → khutbah (no iqamah).
- Times 12h without AM/PM by default ("1:05").
- Stage is a fixed 1920×1080 px box scaled by the engine. Smallest text ≥ 18 px; times ≥ 54 px (≥ 44 px in bottom bar).
- Poster area ratios: bottom layout 12:5, side layout 5:4, in every theme.
- `lite` mode: no `backdrop-filter`, blur, glow or large shadow. Layout identical.
- Kematian template: no accent colour, no decoration.
- Arabic text: `lang="ar" dir="rtl"`.
- Network failures never blank the TV screen.

## Non-negotiables (admin + backend, Phase 2)
- **Never** put the Supabase service-role/secret key in app code, `NEXT_PUBLIC_*` vars, logs or commits. It is allowed only in `.env.local` for local scripts and in CI secrets.
- All data access goes through RLS-protected tables or the RPC functions in `11-schema.sql`. Do not weaken RLS or grants to make something work — stop and ask.
- The TV never has a user session; it uses only `pair_start`, `pair_status`, `screen_bundle` with its device secret.
- Static export: **no dynamic route segments** (`[id]`); use query params.
- No hard-coded UI text in admin components: use `ms.json` / `en.json` (BM default).
- Mobile-first: designed at 390 px, works 360–430 px; tap targets ≥ 44 px; real `<button>`, `<a>`, `<label>` elements.
- Images are compressed in the browser to WebP before upload (posters ≤ 1920 px long edge, logos ≤ 512 px).

## How to work (every task)
1. Read the relevant spec sections first. Produce a short plan listing files you will create/change. Wait for approval if the task touches more than one folder above or adds a migration.
2. Change only files in scope of the current prompt. Do not refactor or restyle unrelated code.
3. Write/update Vitest tests for any logic in `src/core`, `src/data`, `src/templates`.
4. Before saying "done", run `npm test` and `npm run build`. Both must pass. Paste the summary lines.
5. Finish with a plain-English summary for a non-coder: what changed, how to check it (exact URL to open), anything still open.
6. Push finished work (tests + build passing) to `main`: approved by the owner on 2026-10-19, and Cloudflare Pages deploys it. Do **not** apply migrations to a remote database, deploy anywhere else, or delete folders unless asked.
7. No new npm dependencies without saying why in the plan.

## Debug URL params (only with `?debug=1` or on localhost)
`sim=2026-10-17T13:04:30` · `speed=10` · `theme=alam|serambi|tenang` · `layout=full|bottom|side` · `mode=azan|iqamah|solat|khutbah` · `day=fri` · `lite=1` · `local=1` (use screen.json instead of Supabase)

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
