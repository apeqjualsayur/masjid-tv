# Landing Page Build — Prompts (Claude Code or Antigravity)

Build **after Phase 2 is live** (the page links to `/admin` and reuses the themes and the prayer engine). Same method: **one prompt per session**, run in order, do the **Check** before moving on, **commit after every passing check** (`git add -A && git commit -m "L.x done"`). If a check fails, paste the error back and ask for a fix.

Sections marked **🧑 You** are manual steps.

---

## L.0 🧑 You — copy files (≈10 min)
1. Copy into the project: `_specs/20-PRD-landing.md`, `_specs/21-landing-prompts.md`, and `designs/landing/Lembut-Full.dc.html`.
2. Recommended: on the "Masjid View Landing Page" canvas, export PNGs of the two FINAL boards (Arah 4 Lembut, computer and phone) into `designs/landing/ref/desktop.png` and `designs/landing/ref/phone.png`.
3. Check the logo pack is installed: `public/brand/mv-lockup.svg`, `mv-lockup-white.svg`, `mv-app-icon.svg`, `mv-mark.svg` exist. If not, copy `masjid-view-logo/public/` into `public/` first.
4. Have ready (or leave blank for now): contact email, WhatsApp number, developer credit text.

---

## L.1 Landing shell, tokens, site facts, i18n

```
Read _specs/20-PRD-landing.md and designs/landing/Lembut-Full.dc.html (read markup, inline styles and the renderVals() data at the bottom; it does not run standalone).
1. Create src/landing/ for all landing code. Add the Lembut palette from PRD §3 as Tailwind theme tokens (lb-primary, lb-deep, lb-ink, lb-muted, lb-soft, lb-ground, lb-line). Load Outfit and Manrope with next/font/google.
2. Create src/landing/site.ts exactly as in _specs/20-PRD-landing.md §3.1: credit 'Hamba Allah', contactEmail 'afiqsyazwan@gmail.com', whatsapp '' and supportUrl ''. Components must hide a row whose value is empty instead of showing a placeholder.
3. i18n: src/landing/i18n/ms.json with ALL copy from the design (headings, paragraphs, features, steps, FAQ, templates, devices, footer). Add en.json with the same keys, translated by you into natural English; keep prayer names (Subuh, Zohor…), "AJK", "masjid" and "surau" untranslated. A tiny t(lang, key) helper, no new dependency.
4. Routes: src/app/page.tsx renders <Landing lang="ms" />, src/app/en/page.tsx renders <Landing lang="en" />. Per-route metadata (title/description from the json), <html lang> correct on each.
5. Build only the Header (sticky, lockup /brand/mv-lockup.svg, nav anchors, BM/EN link that keeps the current hash, Log masuk → /admin, Daftar percuma → /admin, mobile menu sheet < 900 px with focus trap and Esc to close) and the Footer (white lockup, columns, site.ts values, "Waktu solat berdasarkan data e-Solat JAKIM.").
6. Place an empty <section id> for every section in PRD §4 so anchors already work.
Do not touch src/core, src/themes or /admin code in this step.
```
**Check:** `npm run dev` → `/` and `/en` show header + footer; resize to 390 px, the menu sheet opens and closes with Esc; BM/EN toggle keeps `#cara` in the URL. `npm run build` passes.

---

## L.2 Hero with a live TV

```
Implement sections 2 (Hero) and 3 (Numbers band) per PRD §4 and the design.
1. Create src/landing/TvFrame.tsx: a CSS TV (bezel radius 14, padding 10, stand and foot as in the design) that renders children at a fixed 1920×1080 stage and scales them to the frame width with a ResizeObserver (transform: scale, transform-origin top left). Also create PhoneFrame and LaptopFrame from the design.
2. Hero TV: render the REAL Tenang theme (src/themes/tenang), bottom layout, with a fixed demo content object (masjid "Masjid Al-Hidayah", one Kuliah slide "Adab Menuntut Ilmu", Ustaz [Nama Penceramah]) and prayer times for WLY01 from the bundled data via src/core. The current phase comes from the real clock in Asia/Kuala_Lumpur; support ?sim=<ISO> on / for testing. No network requests.
3. The hero background glow colour follows the phase (values from the design's TH table → move them into the Tenang palette if they already exist there, don't duplicate).
4. Phone mockup overlapping the TV (coded illustration from the design), hidden < 900 px.
5. App icon /brand/mv-app-icon.svg (64 px) above the chip. H1 is the LCP element: render text immediately, mount the theme after first paint.
6. Numbers band exactly as the design.
```
**Check:** `/` at 1440 and 390 vs `designs/landing/ref/*.png`. `/?sim=2026-10-23T05:40:00+08:00` shows Subuh colours, `…T21:00:00+08:00` shows Isyak (dark). DevTools Network: no API calls from the landing page.

---

## L.3 Content sections

```
Implement sections 4, 5, 6, 8, 11, 12, 13 per PRD §4 and the design, all copy from i18n json.
- 4 Sebelum / Dengan Masjid View, 5 Ciri-ciri (8 cards, 1 column on phone), 12 Cara bermula (4 steps + "Apa yang diperlukan" line). There is no "Kenapa percuma" section (removed); "free" is only said in the hero chip and the numbers band.
- 6 Satu hari di skrin masjid: 5 small TvFrames. Try rendering the real Tenang theme in each mode (normal, pre_azan, azan, iqamah, solat) using the engine's sim time; if the theme cannot be forced into a mode without hacks, use coded tiles exactly as in the design and tell me which you chose.
- 8 Templat: 10 cards; thumbnails = real template renders from src/templates at 12:5 inside a scaled stage, with the sample data each template already has.
- 11 Tema: 3 TvFrames with the real Tenang, Serambi, Alam themes, full layout, fixed sim times (Tenang 13:20, Serambi 19:15, Alam 19:06).
- Mount every theme render only when it scrolls into view (IntersectionObserver), and freeze its clock (no per-second re-render off-screen).
```
**Check:** scroll the whole page at 1440 and 390, compare with the design. Chrome Performance tab: no long tasks > 200 ms while scrolling. `npm run build` passes.

---

## L.4 Panel AJK, devices, Cuba sekarang

```
Implement sections 7, 9, 10 per PRD §4 and the design.
- 7 Panel AJK: LaptopFrame (sidebar, Templat: Kuliah form, live preview) and PhoneFrame (template picker, "Muat naik poster · 1920×800") as coded illustrations + 4 benefit cards. Stacks vertically on phone.
- 10 Guna TV sedia ada: URL pill, 4 device cards, strip with the pairing illustration (mv-mark.svg + sample code "482 913") and the offline note. Do not name TV brands.
- 9 Cuba sekarang: name input (label, max 60 chars), theme buttons Tenang/Serambi/Alam (aria-pressed), TvFrame with the REAL selected theme, full layout, showing the typed name and a monogram built from the first letters of the first two words after removing "Masjid"/"Surau" (fallback "MV"). State is local only; nothing stored, sent or logged. Link "Suka? Daftar masjid ini secara percuma →" goes to /admin.
```
**Check:** type "Surau Al-Ikhlas Taman Melati" → monogram "AT", name shows in all 3 themes; DevTools Network stays empty while typing. Keyboard only: Tab reaches the input and all 3 buttons.

---

## L.5 FAQ, CTA band, JSON-LD

```
Implement sections 14 and 15.
- FAQ: 10 <details> (first open), summary is a real button-like row with a rotating +, keyboard accessible.
- CTA band: Daftar percuma → /admin, Lihat demo → /tv?demo=1 (new tab, rel="noopener").
- Add JSON-LD in the page head: SoftwareApplication (price 0, MYR, operatingSystem Web) and FAQPage built from the same i18n FAQ list (per language).
```
**Check:** Google Rich Results Test (paste the HTML from `npm run build` output `out/index.html`) shows FAQ and Software App with no errors.

---

## L.6 Live demo `/tv?demo=1`

```
Read PRD §6. On the existing /tv page:
1. When ?demo=1: skip pairing and Supabase entirely; load public/config/demo.json (create it: masjid "Masjid Demo Masjid View", zone WLY01, theme tenang, layout bottom, default iqamah minutes, slides: kuliah, infaq (target RM50,000, progress RM32,400), imam & bilal, and one poster public/config/demo-poster.png at 1920×800 that you generate — simple, branded, no real people or real masjid names).
2. Keep theme/layout/sim/speed query params working on top of the demo.
3. Show a small fixed "DEMO · masjidview.my" badge (bottom-right, 60% opacity, theme text colour).
4. Make sure /tv has <meta name="robots" content="noindex">.
5. Add tests: demo mode never calls Supabase (mock the client and assert zero calls).
```
**Check:** open `/tv?demo=1` in a private window (not signed in): runs, badge visible, slides rotate. Turn WiFi off and reload: still runs. `/tv?demo=1&theme=serambi&layout=side` works. `npm test` passes.

---

## L.7 `/panduan`, SEO files, OG image

```
1. Create /panduan and /en/panduan per PRD §7 (same header/footer, i18n keys under "panduan"). Screenshot slots are <img> with alt text pointing to public/panduan/*.png; if a file is missing, hide the image, keep the text.
2. hreflang alternates + canonical on /, /en, /panduan, /en/panduan.
3. public/robots.txt (disallow /admin, /tv; sitemap line) and public/sitemap.xml with the 5 URLs in PRD §8 using https://masjidview.my.
4. OG image: scripts/og.ts renders an HTML template (lockup, H1, a TV frame on #F4F9F6) with Playwright (Chromium is at /opt/pw-browsers or the default Playwright path — do NOT run playwright install) to public/og.png 1200×630. Add og:image, og:title, og:description, twitter:card=summary_large_image to both languages.
```
**Check:** `npm run build` → `out/` contains `index.html`, `en/index.html`, `panduan/index.html`, `en/panduan/index.html`, `robots.txt`, `sitemap.xml`, `og.png`. Open `og.png` and check it looks right.

---

## L.8 QA pass and deploy preview

```
1. Run Lighthouse (mobile) on the production build (npx serve out or the Cloudflare preview). Report the four scores; fix anything under PRD §9 bars.
2. Check no horizontal scroll at 360, 390, 768, 1024, 1440, 1920 px (Playwright screenshots into designs/landing/qa/, git-ignored).
3. grep the built HTML: no "[" placeholders, "JAKIM" only in the allowed phrases, no numbers of users/downloads, no testimonials.
4. Verify every link in PRD §5.
5. Run npm test and npm run build. Do not deploy to production or push unless I ask.
Give me a short pass/fail table against PRD §10 acceptance criteria.
```
**🧑 You:** push to the preview branch (or ask the agent to), open the Cloudflare preview on your phone and laptop, then point `masjidview.my` (Hostinger DNS → Cloudflare Pages custom domain) when you are happy.
