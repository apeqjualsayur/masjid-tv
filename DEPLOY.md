# Putting Masjid TV online (Cloudflare Pages)

This guide puts the display on the internet at an address like `https://masjid-tv.pages.dev/tv/`, free of charge. After the first setup, every change you save to GitHub goes online by itself.

You do **not** need to type any commands. You need:

- a computer with this `masjid-tv` folder on it,
- an email address,
- about 30 minutes the first time.

**How the pieces fit together:**

```
  Your computer  ──(GitHub Desktop)──▶  GitHub  ──(automatic)──▶  Cloudflare Pages  ──▶  TV in the masjid
  (the folder)                          (keeps the code,          (builds the site and
                                         runs the tests)           puts it online)
```

> Websites change their buttons from time to time. If a button in this guide has a slightly different name, look for the closest match.

---

## Part 1 — Put the code on GitHub

GitHub keeps a copy of the code and tells Cloudflare whenever it changes.

1. Go to **https://github.com/signup** and create a free account. Confirm your email.
2. Download and install **GitHub Desktop** from **https://desktop.github.com**. Open it and sign in with your GitHub account.
3. In GitHub Desktop choose **File → Add local repository…**
4. Click **Choose…** and select the `masjid-tv` folder. Click **Add repository**.
5. GitHub Desktop says *"This directory does not appear to be a Git repository"*. Click the link **create a repository** in that message.
   - **Name:** `masjid-tv`
   - Leave **Git ignore** as *None* and **License** as *None* (the folder already has the right settings).
   - Click **Create repository**.
6. Click **Publish repository** (top bar).
   - Keep **Keep this code private** ticked if you do not want the public to see it. Cloudflare works with private code too.
   - Click **Publish repository**.
7. Check: open **https://github.com/YOUR-NAME/masjid-tv** in a browser. You should see the folders (`_specs`, `public`, `src`, …).

Within a minute GitHub starts testing the code by itself (see Part 5).

---

## Part 2 — Create a Cloudflare account

1. Go to **https://dash.cloudflare.com/sign-up**.
2. Enter your email and a password, then confirm your email.
3. If asked what you want to do, you can skip. The **Free** plan is enough.

---

## Part 3 — Create the Pages project and connect GitHub

1. In the Cloudflare dashboard, open **Workers & Pages** in the left menu (it may be under **Compute (Workers)**).
2. Click **Create** (or **Create application**). Cloudflare now shows Workers and Pages under one button, and it opens the **Workers** setup by default. **Do not use the Workers setup.** It asks for a "Deploy command" (`npx wrangler deploy`), which this project does not use.
   - At the bottom of the first screen, click the small link **"Looking to deploy Pages? Get started"** (older dashboards have a **Pages** tab instead).
   - Then choose **Import an existing Git repository** (or **Connect to Git**).
   - You are in the right place when the settings page has **Framework preset** and **Build output directory** boxes, and **no** "Deploy command" box.
3. Click **Connect GitHub**. A GitHub window opens:
   - Choose your account.
   - Select **Only select repositories** and pick **masjid-tv**.
   - Click **Install & Authorize**.
4. Back in Cloudflare, select **masjid-tv** and click **Begin setup**.
5. Fill in the settings **exactly** like this:

   | Setting | What to enter |
   |---|---|
   | Project name | `masjid-tv` (this becomes the web address `masjid-tv.pages.dev`; if it is taken, try `masjid-tv-<your area>`) |
   | Production branch | `main` |
   | Framework preset | **None** (do *not* pick "Next.js": it would skip the offline part of the build) |
   | Build command | `npm run build` |
   | Build output directory | `out` |
   | Root directory | leave empty |

6. Open **Environment variables (advanced)** and add one:

   | Variable name | Value |
   |---|---|
   | `NODE_VERSION` | `24` |

7. Click **Save and Deploy**.
8. Wait 3 to 5 minutes. You can watch the build log. When it says **Success**, Cloudflare shows the address, for example `https://masjid-tv.pages.dev`.
9. Open **`https://masjid-tv.pages.dev/tv/`** (use your project name). The prayer-time display should appear.

That address is what the TV opens. Write it down for the TV setup (`_specs/04-pilot-setup.md`). Cloudflare may add a few letters to the name (for example `masjid-tv-6d8.pages.dev`); always use the address Cloudflare shows you.

---

## Part 4 — Making changes, and preview links

Every time a change reaches GitHub, Cloudflare builds the site again by itself. Where it goes depends on the **branch**:

| You save the change to… | It appears at… | The TVs see it? |
|---|---|---|
| `main` | `https://masjid-tv.pages.dev` (production) | **Yes**, at their next reload (daily at 03:00, or when restarted) |
| any other branch, e.g. `try-new-theme` | `https://try-new-theme.masjid-tv.pages.dev` (preview) | No |

Every build also gets its own permanent link, like `https://3f2a1b9c.masjid-tv.pages.dev`, so you can always look back at an older version.

**Safe way to change something (recommended):**

1. In GitHub Desktop, click **Current Branch → New Branch**. Name it after the change, e.g. `ubah-waktu-iqamah`. Click **Create Branch**.
2. Make the change in the folder. For example, open `public/config/screen.json` in Notepad and change the iqamah minutes. Save the file.
3. In GitHub Desktop you see the change listed. Write a short summary at the bottom left (e.g. *"Iqamah Maghrib 10 minit"*) and click **Commit to ubah-waktu-iqamah**.
4. Click **Publish branch** (or **Push origin**).
5. After 3 to 5 minutes, open the preview: `https://ubah-waktu-iqamah.masjid-tv.pages.dev/tv/`. You can also find it in Cloudflare under **Workers & Pages → masjid-tv → Deployments**, or on GitHub next to the change (click the check mark).
6. Happy with it? In GitHub Desktop click **Create Pull Request** (or **Preview Pull Request**), then on the GitHub page click **Create pull request**, wait for the green tick, and click **Merge pull request**. The change goes to `main` and is live a few minutes later.

**Quick way** (for small, certain changes): commit directly on `main` and click **Push origin**. It goes live straight away.

**Common settings** in `public/config/screen.json`:

| Setting | Meaning |
|---|---|
| `masjid.fullName`, `masjid.shortName` | Name shown on screen and the 2–3 letter monogram |
| `zone` | JAKIM zone code, e.g. `SGR01` |
| `theme` | `alam`, `serambi` or `tenang` |
| `layout` | `full`, `bottom` (announcements on top) or `side` (announcements on the left) |
| `iqamahMin` | Minutes from azan to iqamah for each waktu |
| `durations` | Minutes for the pre-azan banner, azan, solat and khutbah screens |
| `ticker` | Lines of running text |

Announcement slides are in `public/config/sample-slides.json`.

---

## Part 5 — Automatic tests on GitHub

Every push runs the tests on GitHub before you trust a change.

1. Open your repository on GitHub and click the **Actions** tab.
2. Each push has a row:
   - **green tick** = all tests passed and the site builds,
   - **red cross** = something is broken. Click it to see which step failed. Do not merge a change with a red cross into `main`.
3. Changes on `main` also run the **browser acceptance checks** (a real Chrome checks the azan → iqamah → solat sequence, Friday khutbah, offline behaviour and all 9 theme/layout combinations). Click a finished run and download **e2e-output** at the bottom to see the screenshots and report.
4. To run the browser checks on another branch: **Actions → Tests → Run workflow**, choose the branch.

GitHub gives 2,000 free test minutes a month for private repositories (unlimited for public ones). One run uses about 3 minutes, or about 8 on `main`.

Cloudflare's free plan allows 500 builds a month.

---

## Part 6 — Checking a TV remotely

Add `?debug=1` to the address, e.g. `https://masjid-tv.pages.dev/tv/?debug=1`. A bar at the bottom shows where the prayer times came from (`live`, `cache` or `fallback`), when the data and clock last synced, the app version, and whether offline support is active. Remove `?debug=1` for normal use.

---

## Once a year: next year's prayer times

The display carries a full year of prayer times so it works without internet. When JAKIM publishes the next year (usually in December), someone comfortable with a terminal runs:

```
npm run fetch-year -- SGR01 2027
```

(use the masjid's zone), then commits the new file in `public/data/` and pushes it. **Do this before 31 December 2026**, or a TV that is offline on 1 January shows "Data waktu tidak tersedia".

---

## Troubleshooting

| Problem | What to do |
|---|---|
| Cloudflare build **failed** | Open the deployment and read the last red lines of the log. Most often: `NODE_VERSION` is missing or not `24` (Part 3 step 6). Fix it under **Settings → Environment variables**, then **Retry deployment**. |
| The address shows **404 Not Found** | Make sure you added `/tv/` at the end. If the whole site is 404, check **Build output directory** is `out` (Settings → Builds). |
| Project name is taken | Pick another, e.g. `masjid-tv-shahalam`. The TV address changes to match. |
| No preview link for a branch | Cloudflare → masjid-tv → **Settings → Builds & deployments → Preview branches**: set to **All non-production branches**. |
| The TV still shows the old version | It updates at its next reload: automatically at 03:00, or restart the TV/browser. Reload twice if it was online for less than a minute. |
| GitHub shows a **red cross** | Open the run under **Actions** and send a screenshot of the red step to whoever maintains the code. |
| You changed `screen.json` and the screen broke | Undo it: in GitHub Desktop, right-click the change under **History → Revert changes in commit**, then **Push origin**. |

---

## For the maintainer (technical summary)

- Static export (`output: "export"`) → `out/`. `npm run build` = `next build` + `scripts/build-sw.ts` (writes `out/sw.js` with the precache list).
- Cloudflare Pages: preset None, build `npm run build`, output `out`, `NODE_VERSION=24` (also pinned in `.node-version`).
- `public/_headers` sets `no-cache` on `sw.js`, `/config/*`, `/data/*` and long-term caching on `/_next/static/*`.
- No secrets or server-side code. The browser calls `api.waktusolat.app` directly (CORS allowed).
- CI: `.github/workflows/test.yml`: `test` job (lint, unit tests, build) on every push/PR; `e2e` job on `main` and manual dispatch, uploads `e2e-output/`.