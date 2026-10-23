# Masjid View — Production setup (masjidview-prod)

**For:** the platform owner, step by step, no coding needed.
**Time:** about 1½ hours, in one sitting. Do the parts in order.
**Status today:** the live site masjidview.my uses the **dev** project (`masjidview-dev`). After Part H it uses **prod**; dev stays for testing and preview builds.

> **Keys rule (never break it):** the Supabase **secret / service_role** key, the database **password**, the **Resend** API key and the Google **client secret** never go in chat, in code, in a commit or in a `NEXT_PUBLIC_…` variable. They go only into the dashboard fields named below, or into GitHub **secrets**.

---

## Part A — Create the project (10 min)

1. Go to **supabase.com/dashboard** → **New project**.
2. Name: `masjidview-prod`. Region: **Southeast Asia (Singapore)** (closest to Malaysia).
3. **Database password:** click **Generate**, then copy it into your password manager. You need it in Part I (backups). Don't put it anywhere else.
4. Plan: Free. Click **Create new project** and wait until it says the project is ready.
5. Write down the **project ref**: the part after `/project/` in the address bar (20 letters). It's not secret.

## Part B — Run the migrations (15 min)

Run each file in **SQL Editor → + New query**: paste the **whole** file, click **Run**, and wait for "Success". Go **in this order**, one at a time:

| # | File (in the repo, `supabase/migrations/`) |
|---|---|
| 1 | `0001_init.sql` |
| 2 | `0002_pair_claim_attempts.sql` |
| 3 | `0003_platform_org_list.sql` |
| 4 | `0004_media_obj_select.sql` |
| 5 | `0005_reorder_slides.sql` |
| 6 | `0006_account_rules.sql` |
| 7 | `0007_friday.sql` |

If any file shows an **error**: stop, don't run the next one, and send the error text to Claude.

**Check** (new query, Run). You should see `jumaatSolatMin` in the result and a non-null `invite_member`:
```sql
select column_default from information_schema.columns where table_name = 'org_settings' and column_name = 'durations';
select to_regprocedure('public.invite_member(uuid,text)');
```

## Part C — Nightly cleanup with pg_cron (5 min)

This deletes death notices 30 days after they end (the privacy notice promises this), plus old pairing codes, failed attempts and expired invitations.

1. **Database → Extensions**, search **pg_cron**, switch it **on** (schema: `pg_catalog`, the default).
2. SQL Editor → new query → Run:
```sql
select cron.schedule('masjidview-cleanup', '30 19 * * *',  -- 03:30 Malaysia time (UTC+8)
$$
  delete from public.slides where template_key = 'kematian' and ends_at < now() - interval '30 days';
  delete from public.pairing_codes where (claimed_at is null and expires_at < now() - interval '1 day')
                                      or claimed_at < now() - interval '30 days';
  delete from public.pair_attempts where attempted_at < now() - interval '1 day';
  delete from public.invitations where accepted_at is null and expires_at < now() - interval '30 days';
$$);
```
3. **Check:** `select jobname, schedule from cron.job;` shows one row, `masjidview-cleanup`.

> Do the same on **dev** if it isn't scheduled there yet (run the check on dev first).

## Part D — Google sign-in (15 min)

1. **Google Cloud Console** → the same project as dev → **Google Auth Platform → Clients** → open the existing **Web client**.
2. Under **Authorized redirect URIs**, click **+ Add URI** and add (with your prod ref):
   `https://PROD-REF.supabase.co/auth/v1/callback`
   Keep the dev one too. Click **Save**.
3. **Google Auth Platform → Audience**: if **Publishing status** is "Testing", only listed test users can sign in. Before the pilot, click **Publish app** (the app only asks for name and email, so Google normally doesn't need a review).
4. Supabase prod → **Authentication → Sign In / Providers → Google** → switch **on** → paste the **Client ID** and **Client secret** from that client → **Save**. (Type the secret straight into this field, nowhere else.)

## Part E — URL configuration (3 min)

Supabase prod → **Authentication → URL Configuration**:
- **Site URL:** `https://masjidview.my/admin/`
- **Redirect URLs** (Add URL for each):
  - `https://masjidview.my/admin/`
  - `https://masjidview.my/**`

Keep the **dev** project's URL settings for previews and local work: `http://localhost:3100/**` and `https://*.masjid-tv-6d8.pages.dev/**`.

## Part F — E-mails through Resend (20 min)

Supabase's built-in e-mail is for testing only (a few e-mails per hour). Real sign-in links go through Resend.

1. **Resend → Domains → Add domain** → `masjidview.my` → region Singapore if offered.
2. Resend shows DNS records (MX, TXT/SPF, DKIM). In **Cloudflare → masjidview.my → DNS → Records**, add each one exactly. Turn the orange cloud **off** (DNS only) for these. Back in Resend, click **Verify**. It can take a few minutes up to a few hours.
3. **Resend → API Keys → Create** → name `supabase-prod-smtp`, permission **Sending access**, domain `masjidview.my`. Copy it (you only see it once).
4. Supabase prod → **Authentication → Emails → SMTP Settings** → **Enable custom SMTP**:
   - Sender email `noreply@masjidview.my`, sender name `Masjid View`
   - Host `smtp.resend.com`, port `465`, username `resend`, password = the key from step 3
   - **Save**.
5. **Authentication → Rate Limits:** set "emails per hour" to about **100**.
6. **Mailbox for the privacy notice:** the notice says `hubungi@masjidview.my`. Create it, for example with **Cloudflare → Email → Email Routing**: add `hubungi@` and forward it to your own inbox.

## Part G — Registration e-mails (`notify` function) and platform owner (10 min)

1. Ask Claude to **deploy the `notify` function to prod** and give it the prod ref. It needs your OK because it deploys to production.
2. Supabase prod → **Edge Functions → Secrets** → add:
   - `RESEND_API_KEY` = a Resend key (a new one named `notify-prod`, Sending access)
   - `NOTIFY_FROM` = `Masjid View <noreply@masjidview.my>`
   - `APP_URL` = `https://masjidview.my`
3. After Part H, sign in once at **masjidview.my/admin** with your Google account. Then, in prod's SQL Editor, run (with your e-mail):
```sql
insert into public.platform_admins (user_id) select id from auth.users where email = 'YOUR_EMAIL';
```

## Part H — Cloudflare: production → prod, previews → dev (10 min)

Supabase prod → **Project Settings → API Keys**: copy the **Project URL** and the **publishable** key (`sb_publishable_…`). These two are public by design. **Not** the secret key.

**Cloudflare → Workers & Pages → masjid-tv-6d8 → Settings → Variables and Secrets:**

| Variable | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://PROD-REF.supabase.co` | `https://fiensjdqyitikskblagy.supabase.co` (dev) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod publishable key | dev publishable key |

Use the environment switch at the top of that page to edit **Production** and **Preview** separately. Then **Deployments → latest production deployment → ⋯ → Retry deployment**. These values are baked in at build time, so a rebuild is needed.

**Check:** open masjidview.my/admin, sign in with Google, and you should land on Platform. TVs that were paired while the site used dev will show a new pairing code after the switch (their pairing belongs to dev). Pair them again from Skrin on prod.

## Part I — Weekly backups (10 min)

The workflow `.github/workflows/backup.yml` runs every Monday at 03:00 (Malaysia time). It encrypts the backup, because the GitHub repository is **public** and anyone signed in to GitHub can download a public repo's workflow files.

1. **Database address:** Supabase prod → **Connect** (top bar) → **Connection string** → type **URI** → method **Session pooler**. Copy it and replace `[YOUR-PASSWORD]` with the database password from Part A. (Use the session pooler: GitHub's servers can't reach the "direct connection".)
2. **Passphrase:** make a long random passphrase (at least 20 characters; your password manager can generate one). **Save it in your password manager.** Without it the backups can't be opened, and nobody can recover it.
3. **GitHub → apeqjualsayur/masjid-tv → Settings → Secrets and variables → Actions → New repository secret**:
   - Name `PROD_DATABASE_URL`, value: the address from step 1 → **Add secret**
   - Name `BACKUP_PASSPHRASE`, value: the passphrase from step 2 → **Add secret**
4. **Test it now:** **Actions → Weekly database backup → Run workflow**. After 2–4 minutes it should show a green tick, with a file `masjidview-prod-…` under **Artifacts**. A red cross means something failed: open it and send Claude the error line. Secrets are hidden as `***` in the log.

### Restore a backup (only in an emergency, ideally with Claude)
1. Download the artifact from the workflow run and unzip it, which gives you `masjidview-prod-….dump.gpg`.
2. Decrypt: `gpg --decrypt --output backup.dump masjidview-prod-….dump.gpg` (it asks for the passphrase).
3. Restore into a **new, empty** Supabase project, never over the live one first: `pg_restore --no-owner --no-privileges --dbname "NEW-PROJECT-URI" backup.dump`. Messages about existing Supabase schemas are expected; Claude can check which tables came back.
4. **Logos and posters are files in Storage, not in the database dump.** They are re-uploaded by the AJK if lost; the TVs also keep a cached copy.

---

## Done checklist
- [ ] B: 7 migrations, check query OK
- [ ] C: `masjidview-cleanup` job listed (prod, and dev)
- [ ] D–E: Google sign-in works on masjidview.my
- [ ] F: a magic-link e-mail arrives from `noreply@masjidview.my`; `hubungi@` forwards to you
- [ ] G: platform owner row added; a test registration sends the e-mail
- [ ] H: Production = prod, Preview = dev; site rebuilt
- [ ] I: first backup run green, passphrase saved in the password manager