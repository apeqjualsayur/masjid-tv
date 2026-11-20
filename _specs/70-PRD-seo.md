# Masjid View — Discovery, SEO, GEO and AEO PRD (v1.0)

Status: approved plan, build after enhancements (done 20 Nov 2026). Paid per-masjid pages are **out of scope** (on hold; URL prefix `/m/` reserved for them).
Prompts: `_specs/71-seo-prompts.md` · Article copy: `_specs/72-articles-content.md` · Baseline: full audit of 17 Nov 2026 (SEO 6, GEO 4, AEO 5 = 15/30).

## 1. Goal
Make masjidview.my the answer when an AJK, a search engine or an AI assistant looks for "skrin / TV waktu solat untuk masjid dan surau" in Malaysia.

| Measure | Baseline (Nov 2026) | Target (end Feb 2027) | Where |
|---|---|---|---|
| Indexed URLs | 5 in sitemap, index status unknown | ≥ 20 indexed | Search Console → Pages |
| Brand query "masjid view" | site not in results | position 1 | Search Console → Performance |
| Non-brand impressions / month | unknown | ≥ 3,000 | Search Console |
| AI answer test (§9) | not mentioned | mentioned in ≥ 2 of 4 assistants | monthly manual test |
| Rich result errors | not tested | 0 | Rich Results Test / Search Console |
| Lighthouse SEO (mobile) | not measured | ≥ 95 on every public page | Lighthouse |

## 2. Principles
1. **Static and fast.** Everything stays inside the static export (`output: 'export'`). No new runtime dependencies without a reason in the plan.
2. **One source of truth.** Titles, descriptions, FAQ, schema and llms.txt are generated from the same i18n / content files. Never type the same fact twice.
3. **Honest claims.** "Berdasarkan data e-Solat JAKIM" only. No implied JAKIM endorsement, no invented user counts, ratings or testimonials. Ramadan dates always "jangkaan" until announced.
4. **BM first.** Malay pages are the primary target; English mirrors where they already exist. A page without a translation has no hreflang pair.
5. **Answer first.** Every page and article opens with a 40–60 word direct answer, then detail.

## 3. Workstreams

### A. Measurement and indexing (you, no code) — prompt S0
- Google Search Console: **Domain property** for `masjidview.my`, verified with a DNS TXT record in Cloudflare. Submit `https://masjidview.my/sitemap.xml`.
- Bing Webmaster Tools: import the site from Search Console. Bing's index also feeds Microsoft Copilot and is used by ChatGPT search.
- Cloudflare: turn on **Web Analytics** (cookieless) for the Pages project; turn on **Crawler Hints** (sends IndexNow pings to Bing and others when pages change); check the AI-crawler settings (**Block AI bots** / **AI Crawl Control** / managed robots.txt) so search-type AI crawlers are **allowed** on the public pages.
- Record the §9 baseline before any change.

### B. Technical foundation — S2, S3, S4
| Item | Requirement |
|---|---|
| Titles | ≤ 60 chars, unique per page, brand at the end: "Skrin waktu solat untuk TV masjid & surau · Masjid View" (home BM). |
| Descriptions | 120–155 chars, unique, ends with a reason to click. |
| `<html lang>` | `ms` on BM pages, `en` on EN pages. |
| hreflang | `ms`, `en`, `x-default` (→ BM) on every page that has a pair; self-canonical on every public page. |
| Privacy | `/privasi` title "Notis Privasi · Masjid View" (currently "Masjid TV"); add `/en/privasi` if missing. |
| Images | Descriptive alt on header lockup, app icon, pairing mark; decorative SVGs `alt=""` + `aria-hidden`. |
| Anchors | Every nav anchor has a target id (`#peranti` reported missing). Fix "1TV" spacing in /panduan numbered headings. |
| Contact | Email is Cloudflare-obfuscated; keep it, but also expose `contactPoint.email` in Organization JSON-LD and on `/tentang`. |
| robots.txt | Allow all; disallow `/admin`, `/tv`, `/apk`; explicit `Allow: /` groups for `OAI-SearchBot`, `ChatGPT-User`, `GPTBot`, `PerplexityBot`, `ClaudeBot`, `Claude-SearchBot`, `Google-Extended`, `Bingbot`; sitemap line. |
| sitemap.xml | Generated at build from one route list; `lastmod` per URL (content date or last git commit of the source file); includes articles, /tentang, /templat pages. |
| llms.txt | `/llms.txt`: what Masjid View is (BM + EN, 2 short paragraphs), who it is for, cost, devices, data source, then a link list of key pages and articles. Generated at build. |
| Feed | `/artikel/feed.xml` (RSS 2.0) for articles. |

**Structured data (JSON-LD, generated, one `<script>` per page):**
| Page | Types |
|---|---|
| All public pages | `Organization` (name "Masjid View", url, logo, email, `sameAs` = Facebook page / YouTube when set in `site.ts`), `WebSite` (name, url, inLanguage) |
| `/`, `/en` | + `SoftwareApplication` (applicationCategory "LifestyleApplication", operatingSystem "Web browser, Android TV", offers price 0 MYR, featureList, screenshot = og.png, downloadUrl `/apk`) + `FAQPage` |
| `/panduan`, `/en/panduan` | + `HowTo` (steps from the same content) + `BreadcrumbList` |
| `/tentang` | + `AboutPage` + `BreadcrumbList` |
| `/artikel/*` | + `Article` (headline, description, datePublished, dateModified, author/publisher = Organization, inLanguage, image) + `BreadcrumbList` + `FAQPage` when the article has an FAQ |
| `/templat/*` | + `BreadcrumbList` |

Note: Google shows FAQ and HowTo rich results for very few sites today, so this markup will rarely show as rich results. It still helps search engines and AI assistants understand the page, and costs nothing.

### C. Landing content refresh (stale after enhancements) — S5, S6
The live home page still says there is no app to install and lists 10 templates. Update to the shipped product:
- Features: **Android TV app** (optional, `masjidview.my/apk`), **notis Tangguh / Batal**, **kiraan detik aktiviti**, **Hari Kebesaran Islam** slide (countdown to Ramadan, Aidilfitri etc.), **Jadual Imam & Bilal** by day, 12 templates.
- Numbers band: template count read from `src/templates` (not typed).
- New block under the hero, **"Apakah Masjid View?"**: 40–60 words, definition style ("Masjid View ialah …"). Same in EN.
- FAQ: rewrite "Perlukah saya muat turun aplikasi?" (browser works; app optional). Add: "Ada aplikasi untuk Android TV?", "Boleh paparkan jadual imam dan bilal?", "Bagaimana umumkan kuliah yang ditangguhkan?", "Boleh paparkan kiraan hari ke Ramadan?". Keep ≤ 14 questions.
- Link the first mention of "e-Solat JAKIM" to `https://www.e-solat.gov.my` (rel="nofollow noopener", new tab).
- `/panduan`: new section "Aplikasi Masjid View TV (Android TV)" using the steps in the admin "Pasang app di TV" card (same i18n source); "Dikemas kini: <date>" line; screenshot slots kept.

### D. Entity and trust — S7
- New page `/tentang` + `/en/tentang` (nav: footer "Tentang"): what it is, why it exists (free for every masjid and surau), who builds it (**decision D1**), how it is funded, how prayer times are sourced, privacy summary, contact, social links. 250–400 words.
- `site.ts` gains `facebookUrl`, `youtubeUrl` (empty = hidden and left out of `sameAs`).
- Brand name always "Masjid View" (two words, capital M and V) in titles, schema and copy.
- Final privacy notice (PDPA) text remains a separate task; until then the DRAF label stays.

### E. Articles hub — S8, S9
- Routes: `/artikel` (index, newest first) and `/artikel/<slug>`; BM only at launch (**decision D3**). Header nav "Artikel", footer "Bantuan → Artikel".
- Route approach must respect "no dynamic route segments": one small route folder per article that imports a shared `ArticleLayout` and a typed content module, created by a script (`npm run new-article <slug>`). Content stays in `src/content/artikel/<slug>.ts` (typed blocks: heading, paragraph, list, table, faq, callout, cta). No markdown library unless S1 justifies one.
- Article page: breadcrumb, H1, "Diterbitkan / Dikemas kini" dates, author "Pasukan Masjid View", short answer box, body, FAQ, CTA (demo + daftar), 3 related links. Reading time optional.
- Launch set (copy in `72-articles-content.md`):
  1. `/artikel/ramadan-2027-tarikh-jangkaan` — publish by **5 Dec 2026**.
  2. `/artikel/senarai-semak-ramadan-ajk-masjid` — publish by **10 Jan 2027**.
  3. `/artikel/cara-pasang-skrin-waktu-solat-tv-masjid` — publish with the hub.
- Backlog (one per fortnight): templat notis kematian masjid; jadual imam dan bilal; mod khutbah Jumaat; skrin waktu solat tanpa internet; Aidiladha / Maal Hijrah announcements; JWS vs TV pelayar (factual, no competitor names in a bad light).

### F. Template gallery — S10 (sprint 2)
- `/templat` index + one page per template (12), e.g. `/templat/notis-kematian`, `/templat/kuliah-ceramah`, `/templat/jadual-imam-bilal`, `/templat/hari-kebesaran-islam`.
- Each page: answer-first intro (what it is for), a **real render** of the template (Tenang theme, poster 16:9 and bottom 12:5, sample data), the fields AJK fill in, 2–3 usage tips, CTA "Guna templat ini" → `/admin`, links to related templates and articles. 250–400 words. Kematian page: no accent colour, respectful wording.

### G. Off-site and AI visibility (you) — S12
Ongoing, one or two actions per week: Facebook page live and linked; demo video on **YouTube** (title and description in BM, link to the site) and Facebook; pilot masjid case note with their written permission; posts in AJK / masjid admin Facebook groups and Lowyat forum; short pitch email to 3 Malaysian tech or Islamic-lifestyle writers; listing on AlternativeTo and similar directories. Never pay for links or reviews.

## 4. Decisions
| # | Decision | Default used in prompts |
|---|---|---|
| D1 | Who is named as the builder/operator on `/tentang` and in Organization schema | Brand "Masjid View" only, footer credit "Hamba Allah", described as an independent, non-commercial project from Kuala Lumpur. Option: name a registered entity (e.g. Alfateh Design) as publisher for stronger trust. |
| D2 | Facebook / YouTube URLs | Empty until the pages exist; fill `site.ts` then. |
| D3 | English articles | BM only at launch; EN later for the setup guide only. |
| D4 | Template gallery | Yes, sprint 2 after articles. |

## 5. Out of scope
Paid per-masjid pages (`/m/` reserved), Google Business Profile (not a local business), paid ads, link buying, Play Store listing (separate decision).

## 6. Acceptance criteria
1. Every public page: one H1, unique title ≤ 60 chars, description 120–155 chars, self-canonical, correct `lang`, hreflang where a pair exists.
2. Rich Results Test on `/`, `/panduan`, one article: all JSON-LD detected, 0 errors.
3. `/robots.txt`, `/sitemap.xml` (all public URLs with lastmod), `/llms.txt`, `/artikel/feed.xml` served from the build.
4. Home page and FAQ describe the shipped product (app, notices, countdowns, roster, 12 templates); no text says there is no app.
5. `/tentang`, `/artikel` and 3 articles live; Article 1 by 5 Dec 2026.
6. Lighthouse mobile ≥ 90 / 95 / 95 / 95 (Performance / Accessibility / Best Practices / SEO) on `/`, `/panduan`, `/artikel`, one article.
7. Text check: "JAKIM" only as "data e-Solat JAKIM" / "zon JAKIM"; Ramadan dates labelled jangkaan; no testimonials, user counts or ratings.
8. `npm test` and `npm run build` pass; no new runtime dependency without a stated reason.

## 7. Timeline
| Week | Steps |
|---|---|
| 20–27 Nov 2026 | S0 (you), S1–S7 |
| 28 Nov–5 Dec | S8, S9, S11 deploy → Article 1 live |
| Dec | S10 template gallery; first off-site actions |
| Jan 2027 | Article 2 live by 10 Jan; backlog articles fortnightly |
| Monthly | §9 test + Search Console review |

## 8. Risks
- **Thin or duplicate pages** (template pages that only repeat each other): each must have its own intro, fields and tips.
- **Wrong Ramadan dates**: always "jangkaan"; update Article 1 on announcement night.
- **AI crawlers blocked by Cloudflare defaults**: checked in S0 and again in S11.
- **Spec drift**: titles and FAQ live in i18n; changing copy never needs a schema edit.

## 9. AI visibility test (monthly, 15 minutes)
Ask ChatGPT (search on), Gemini, Perplexity and Microsoft Copilot, in a fresh chat each:
1. "Aplikasi atau sistem paparan waktu solat untuk TV masjid yang percuma di Malaysia?"
2. "Bagaimana nak paparkan waktu solat dan pengumuman di TV surau?"
3. "Free prayer time display for mosque TV in Malaysia"
4. "Apa itu Masjid View?"
Record per assistant: mentioned (Y/N), linked (Y/N), facts correct (Y/N). Keep the log in a sheet.
