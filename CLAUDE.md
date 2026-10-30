# Masjid TV

Full-screen prayer-times display for masjid/surau TVs (JAKIM times, clock, azan/iqamah/solat modes, announcements). Must keep working offline for weeks.

## Always read `_specs/` before changing behaviour

- `_specs/00-PRD.md` — product rules: prayer list, current/next/phase rules, mode state machine, data + offline strategy, config, debug URL params, acceptance criteria.
- `_specs/01-theme-contract.md` — `DisplayState` / `ThemeDefinition` interfaces and every theme's tokens, sizes and rules.
- `_specs/02-claude-code-prompts.md` — the Phase 1 build order.
- `_specs/designs/*.dc.html` — visual references (`A-*` alam, `D-*` serambi, `F-*` tenang, `G-*` falak, `I-*` garis, `J-*` kerawang, `K-*` seterusnya; G–K are 1280×720, scale ×1.5). Design-tool source: read the markup and inline styles; they do not run standalone.
- Themes round 2 (4 themes + announcement-only `poster` layout): `_specs/40-PRD-themes-round2.md`, `_specs/41-themes-round2-prompts.md`, `_specs/42-themes-round2-migration.sql`.
- Phase 2 (admin + Supabase): `_specs/10-PRD-phase2.md`, `_specs/11-schema.sql` (full current schema = `supabase/migrations/0001_init.sql` + later numbered migrations), `_specs/12-phase2-prompts.md`, `_specs/designs/admin/*.dc.html`. Project rules for all agents: `AGENTS.md`.

If code and spec disagree, the spec wins — or update the spec first, deliberately.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4, **static export** (`output: 'export'` → `out/`). No server code, API routes or runtime image optimisation.
- Vitest for unit tests (`npm test`). `tsx` for scripts.
- Fonts self-hosted via `next/font/google` in `src/app/fonts.ts` (downloaded at build time, no runtime Google requests). Use the CSS variables / Tailwind `font-*` utilities; never add a `<link>` to Google Fonts.

## Folders

| Path | Contains |
|---|---|
| `src/core/` | Prayer engine: time/`now()`, schedule (current/next/phase), mode state machine, formatting. **Pure TS** |
| `src/data/` | API client (waktusolat.app), IndexedDB cache, bundled fallback, zones list; `bundle.ts`: Phase 2 TV content sync (screen_bundle every 60 s, stored bundle in IndexedDB) |
| `src/themes/` | `types.ts` (ThemeDefinition), `index.ts` (TV: lazy per-theme loading, `useTheme`), `registry.ts` (synchronous, for the admin preview and tests), `ThemeView.tsx` (picks layout vs full-screen mode). Theme render tests in `themes.test.tsx` |
| `src/themes/{alam,serambi,tenang,falak,garis,kerawang,seterusnya}/` | One self-contained folder per theme implementing `ThemeDefinition` |
| `src/templates/` | Announcement template types + sample data (no styling); `schema.ts`: field metadata + validation the admin editor builds its form from; `ayat-sources.json`: the only allowed ayat/hadith (TO BE VERIFIED BY AN USTAZ) |
| `src/app/tv/` | The display page: config + URL overrides → `DisplayState` → selected theme on a 1920×1080 stage. `pairing/`: Phase 2 pairing screen (device secret, pair_start/pair_status, QR). Without `?local=1` (and with Supabase configured) /tv shows pairing |
| `scripts/` | Build-time scripts (e.g. `fetch-year.ts` for fallback data) |
| `public/config/` | `screen.json` (Phase 1 config), logo, sample slides/posters |
| `public/data/` | Bundled 12-month fallback prayer data: `{zone}-{year}.json` |

## Folder rules (hard)

- **No styling in `src/core`**: no React, no CSS, no colours, no DOM. Pure functions that take time/data/config and return values. Everything there is unit-tested.
- **No prayer logic in themes**: themes only render the `DisplayState` they receive. Never compute current/next/phase/mode/countdown or format times inside a theme.
- Themes never import from each other. All theme colours come from that theme's token table for the current `phase` (contract §2).
- Never show guessed prayer times: read order is IndexedDB → bundled fallback → "Data waktu tidak tersedia".
- All time reads go through the single `now()` in `src/core` (clock offset + debug sim/speed).

## Commands

- `npm run dev` — dev server on **port 3100** (LejarKu uses 3000), open http://localhost:3100/admin/, or http://localhost:3100/tv/?local=1 for the Phase 1 display from `public/config/screen.json` (plain `/tv/` shows the pairing screen). On localhost debug params work without `?debug=1`, e.g. `/tv/?local=1&theme=tenang&layout=side&slide=infaq&sim=2026-10-17T14:30`; `?debug=state` shows the raw DisplayState
- `npm test` — Vitest
- `npm run build` — static export to `out/`, then writes `out/sw.js` (service worker from `scripts/sw-template.js` + precache list)
- `npm run lint` — type-check
- `npm run e2e` — browser acceptance checks for PRD §12 against the built `out/` (run `npm run build` first; see `_specs/03-test-plan.md`)
- `npm run sample-slides` — regenerate `public/config/sample-slides.json` from `src/templates/samples.ts`
- `npm run fetch-year -- SGR01 2027` — rebuild the bundled fallback `public/data/{zone}-{year}.json` (re-run when JAKIM publishes a new year)

## Deployment

Cloudflare Pages (static, preset None, build `npm run build`, output `out`, `NODE_VERSION=24`). Non-coder guide: `DEPLOY.md`. CI: `.github/workflows/test.yml`.

- Production: https://masjidview.my/tv/ and https://masjidview.my/admin/ (custom domain on Cloudflare Pages project `masjid-tv-6d8`, also at https://masjid-tv-6d8.pages.dev; deploys from `main`)
- Cloudflare Pages build variables (Plaintext, Production + Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key). Baked in at build time: retry the deployment after changing them. Never the secret key.
- Repository: https://github.com/apeqjualsayur/masjid-tv
