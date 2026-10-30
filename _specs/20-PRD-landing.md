# Masjid View — Landing Page PRD (v0.2)

Design: **Arah 4 · Lembut** — `designs/landing/Lembut-Full.dc.html` (desktop 1440 and phone 390 boards on the "Masjid View Landing Page" canvas). The design file is the source of truth for layout, copy (BM) and colours. Logo: **Pintu Mihrab** (logo pack `masjid-view-logo/`).

## 1. Goal
One public page at `masjidview.my/` that makes an AJK understand in under a minute:
1. what Masjid View shows on the TV,
2. that it runs on **any TV with a web browser** (no special app or box),
3. that the AJK manages it from **phone or computer**,
4. that it is **free**,
and then signs up (`/admin`) or opens the live demo (`/tv?demo=1`).

## 2. Decisions (locked)
| Item | Decision |
|---|---|
| Route | `/` (BM, default) and `/en` (English). Same components, `lang` prop. Static export, no middleware. |
| Stack | Same Next.js app as `/tv` and `/admin` (App Router, `output: 'export'`, Tailwind). Code in `src/landing/`. |
| TV mockups | **Real theme components** from `src/themes/*`, rendered at the 1920×1080 stage and scaled into a CSS TV frame. Fixed demo content, no network calls. |
| Admin mockups | Coded illustrations (HTML/CSS) copied from the design. Not the live admin app. |
| Live demo | `/tv?demo=1`: the real TV page with bundled demo content, no pairing, no Supabase. |
| Editable site facts | One file `src/landing/site.ts` — see §3.1. No placeholders anywhere else. |
| Analytics | None at launch. Optional later: Cloudflare Web Analytics (cookieless). |
| Wording | Always "berdasarkan data e-Solat JAKIM". Never imply JAKIM endorsement, partnership or approval. No invented numbers (downloads, users, ratings) and no invented testimonials. |

## 3. Brand
- **Logo files** (from `masjid-view-logo/public/`, already copied into `public/` during Phase 1/2 install):
  - header: `/brand/mv-lockup.svg` (light) — height 36 px desktop, 32 px phone
  - footer: `/brand/mv-lockup-white.svg`
  - hero app icon: `/brand/mv-app-icon.svg` at 64 px
  - TV pairing illustration: `/brand/mv-mark.svg`
  - favicon / manifest: already handled by `layout.tsx`
- **Brand colours** (logo): green `#146C4A`, gold `#E3B04B`, ink `#12261E`, ground `#F4F7F5`.
- **Lembut page palette** (UI): primary `#4FA36B`, deep `#2F7D4B`, text `#10241B`, muted `#5A6D64`, soft `#E7F4EB` / `#F4F9F6` / `#F7FAF8`, borders `#E4EFE8` / `#EDF3EF`, footer `#10241B`. Define these as Tailwind theme tokens (`lb-primary`, `lb-deep`, …), not inline hex.
- **Fonts**: Outfit 400–800 (page), Manrope 300–800 (inside TV screens — already used by themes). Load with `next/font/google`, `display: swap`, subsets latin. The lockup SVGs have outlined text, so Plus Jakarta Sans is not needed on the landing page.

### 3.1 `src/landing/site.ts` (final values — no placeholders)
```ts
export const site = {
  credit: 'Hamba Allah',               // footer: "© 2026 Masjid View · Hamba Allah"
  contactEmail: 'hubungi@masjidview.my', // footer; mailto: link (forwards to the owner)
  whatsapp: '',                          // empty = footer WhatsApp row is hidden
  supportUrl: '',                        // empty = no support/donation link anywhere
};
```
Components must hide a row whose value is empty (`whatsapp`, `supportUrl`) rather than showing a placeholder. No separate "Kenapa percuma?" text — see §4 row 13 (removed).

## 4. Sections (top to bottom)
IDs are anchor targets for the nav.

| # | Section | Content | Notes |
|---|---|---|---|
| 1 | Header (sticky) | Lockup · Ciri-ciri `#ciri` · Panel AJK `#panel` · Peranti `#peranti` · Cara bermula `#cara` · Soalan lazim `#soalan` · BM/EN · Log masuk · **Daftar percuma** | < 900 px: lockup + Daftar + menu button opening a sheet with the links and BM/EN |
| 2 | Hero | App icon, chip "Percuma untuk semua masjid dan surau", H1, paragraph, **Daftar masjid percuma** + Lihat demo langsung, "Berfungsi pada" device chips. Right: TV (stand + bezel) showing the **Tenang theme, bottom layout, Kuliah slide**, with a phone admin mockup overlapping | TV colours follow the **current prayer time in Kuala Lumpur** (WLY01) using the Phase 1 engine and bundled data; background glow follows too. Phone mockup hidden < 900 px |
| 3 | Numbers band | 7 waktu harian · 10 templat · 3 tema (7 tema once round 2 is switched on, `THEMES_ROUND2_VISIBLE`) · RM0 yuran | This band + the hero chip are the only places "free" is said — no separate section |
| 4 | Sebelum / Dengan Masjid View | 4 + 4 lines | |
| 5 | Ciri-ciri `#ciri` | Heading block left, 8 feature cards right; with round 2 a full-width 9th card "Dua TV, dua tugas" with two real renders (Tenang full + Tenang poster layout) | 1 column on phone |
| 6 | Satu hari di skrin masjid | 5 small TVs: normal, sebelum azan, azan, iqamah, solat | Use the real theme mode renders (Tenang) if feasible; otherwise coded tiles as in design |
| 7 | Panel AJK `#panel` | Laptop (editor + live preview) and phone (template picker + poster size "1920×800") + 4 benefit cards, incl. "Dua pentadbir" (two equal admins per masjid — PRD Phase 2 §3) | Coded illustration |
| 8 | 10 templat | Grid of 10 template cards (12:5 thumbnails) | Thumbnails may be real template renders at small scale |
| 9 | Cuba sekarang `#cuba` | Name input + one button per theme (3, or 7 with round 2; wrap on phone, `aria-pressed`); TV preview updates live with the typed name and monogram | Uses real theme components; nothing is saved or sent |
| 10 | Guna TV sedia ada `#peranti` | URL pill `masjidview.my/tv`, 4 device cards, strip: pairing code + works offline | Device list must not name TV brands that have not been tested |
| 11 | Tema | Small TVs (Tenang, Serambi, Alam; + Falak, Garis Masa, Kerawang, Seterusnya with round 2) + names + one line each | Real theme renders, full layout, mounted when in view, fixed times: Tenang 1:20 pm, Serambi 7:15 pm, Alam 7:06 pm, Falak 6:20 am, Garis Masa 2:40 pm, Kerawang 5:20 pm, Seterusnya 9:10 pm |
| 12 | Cara bermula `#cara` | 4 steps + "Apa yang diperlukan" line | |
| 13 | ~~Kenapa percuma?~~ | **Removed.** "Free" is already covered by the hero chip (§4 row 2) and the numbers band (§4 row 3); no dedicated section. | |
| 14 | Soalan lazim `#soalan` | 10 Q&A as `<details>` (first open) | Also output as FAQPage JSON-LD |
| 15 | CTA band `#daftar` | Heading, line, **Daftar percuma** + Lihat demo | |
| 16 | Footer | Lockup (white), tagline; Produk / Bantuan / Hubungi columns; © year · `site.credit` · "Waktu solat berdasarkan data e-Solat JAKIM." | Hubungi column shows only `site.contactEmail` (mailto:); WhatsApp row hidden since `site.whatsapp` is empty |

## 5. Links
| Element | Target |
|---|---|
| Daftar percuma / Daftar masjid percuma | `/admin` (sign-in; new users are routed to Daftar after sign-in) |
| Log masuk | `/admin` |
| Lihat demo langsung | `/tv?demo=1` in a new tab |
| Panduan pemasangan TV | `/panduan` (new page, §7) |
| Notis Privasi | `/privasi` (page from Phase 2; final PDPA text is a separate task) |
| BM / EN | `/` ↔ `/en`, keeps the current `#anchor` |

## 6. Live demo `/tv?demo=1`
- Loads `public/config/demo.json` (masjid "Masjid Demo Masjid View", zone WLY01, Tenang, bottom layout, iqamah defaults, 4 slides: kuliah, infaq, imam & bilal, one sample poster at 1920×800) and the bundled prayer data. No pairing screen, no Supabase calls.
- Extra query params still work (`theme=serambi|alam|tenang`, `layout=full|bottom|side`, `sim=…`, `speed=…`) so the landing page can link to variants.
- A small fixed badge "DEMO · masjidview.my" in a corner (theme-coloured, 60% opacity) so a screenshot is never mistaken for a real masjid.
- `noindex` on `/tv`.

## 7. `/panduan` — TV setup guide (BM + EN)
Short static page, same header/footer. Sections: (1) Android / Google TV with Fully Kiosk Browser (install, set start URL `https://masjidview.my/tv`, enable start on boot, keep screen on), (2) normal TV + Android TV box, (3) laptop via HDMI (Chrome full screen / kiosk), (4) pairing with the 6-digit code, (5) troubleshooting (no internet, wrong time zone on the device, screen sleeping). Placeholders for screenshots: `public/panduan/*.png`.

## 8. SEO and sharing
- `<html lang="ms">` on `/`, `lang="en"` on `/en`; `hreflang` alternates (ms, en, x-default → `/`) and canonical on both.
- Title (BM): "Masjid View — Paparan waktu solat dan pengumuman untuk TV masjid dan surau". Description ≤ 155 chars, BM.
- Open Graph + Twitter card: `public/og.png` 1200×630 (lockup, headline, TV mockup on soft green). Generate with a script from an HTML template (Playwright is installed), commit the PNG.
- `public/sitemap.xml` (`/`, `/en`, `/panduan`, `/en/panduan`, `/privasi`) and `public/robots.txt` (disallow `/admin`, `/tv`).
- JSON-LD: `SoftwareApplication` (name, applicationCategory "LifestyleApplication", operatingSystem "Web", offers price 0 MYR) and `FAQPage` from the FAQ list.

## 9. Quality bars
- Lighthouse (mobile, production build): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- LCP element is the H1, not the TV; theme renders below the fold are lazy-mounted (IntersectionObserver).
- No horizontal scroll from 360 px to 1920 px. Layout matches the phone board at 390 px and the desktop board at 1440 px.
- All mockups have `aria-label`; decorative SVGs `aria-hidden`. Visible focus rings. Text contrast ≥ 4.5:1.
- `prefers-reduced-motion`: no animated transitions in mockups.
- No new runtime dependencies without justification.

## 10. Acceptance criteria
1. `/` matches `Lembut-Full.dc.html` at 1440 and 390 (side-by-side screenshots), with the Pintu Mihrab lockup in header and footer.
2. Hero TV shows the current KL prayer period; changing the device clock (or `?sim=` on `/`) changes TV colours and the highlighted time.
3. Cuba sekarang: typing a name updates the TV preview instantly in every theme shown; nothing is stored or sent (no network requests in DevTools).
4. `/tv?demo=1` runs without sign-in or internet after first load, shows the DEMO badge, and cycles the 4 demo slides.
5. `/en` is fully English (no BM strings left except proper nouns and prayer names); BM/EN toggle keeps the anchor.
6. Every link in §5 works; `/panduan` exists in BM and EN.
7. Footer shows "Hamba Allah" as credit and only the email contact (no WhatsApp row, no support link); no placeholder text (`[ … ]`) remains anywhere on the page.
8. Lighthouse bars in §9 pass on the Cloudflare preview URL.
9. `npm test` and `npm run build` pass; the static export contains `index.html`, `en/index.html`, `panduan/index.html`.
10. Text check: "JAKIM" only appears as "data e-Solat JAKIM" / "zon JAKIM"; no download/user counts, ratings or testimonials; no "Kenapa percuma" heading anywhere.

## 11. Open items
None — all resolved in §3.1. Only remaining future task: final Notis Privasi (PDPA) text, tracked separately from the landing build.
