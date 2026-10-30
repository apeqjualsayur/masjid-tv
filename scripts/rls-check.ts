// Row Level Security check against a Supabase project (PRD Phase 2 §12.3).
//   npm run rls-check            (reads .env.local)
// The service-role key is used ONLY to create/delete test users, make P a platform admin, and
// verify afterwards that B's rows were not changed. Every permission check runs as a real signed-in
// test user (anon key + session) or as anon. All test data is deleted at the end, even on failure.
// Never prints any key.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!URL || !ANON || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY in .env.local (see .env.example).");
  process.exit(2);
}
if (ANON === SERVICE) {
  console.error("The anon key and the service-role key are the same value. Check .env.local.");
  process.exit(2);
}

const RUN = Date.now().toString(36);
const TAG = "rls-check";
const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(URL, SERVICE, opts);
const anon = createClient(URL, ANON, opts);

// ---------------------------------------------------------------------------- reporting
let passed = 0;
let failed = 0;
const failures: string[] = [];
function report(ok: boolean, name: string, detail?: string) {
  if (ok) passed++;
  else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  }
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `\n        ↳ ${detail}` : ""}`);
}
/** Stops the remaining checks (cleanup still runs). */
class Fatal extends Error {}
type PgErr = { code?: string; message?: string } | null | undefined;
const fmt = (e: PgErr) => (e ? `${e.code ? `[${e.code}] ` : ""}${e.message ?? String(e)}` : "no error");
function must<T>(label: string, res: { data: T; error: PgErr }): T {
  if (res.error) throw new Fatal(`${label}: ${fmt(res.error)}`);
  return res.data;
}
/** The call must fail; optionally with a message containing `want`. */
function expectFail(name: string, res: { error: PgErr }, want?: string) {
  const e = res.error;
  if (!e) return report(false, name, "it succeeded but should have been rejected");
  if (want && !(e.message ?? "").includes(want) && e.code !== want) return report(false, name, `rejected, but with an unexpected error: ${fmt(e)}`);
  report(true, name);
}
function expectOk(name: string, res: { error: PgErr }) {
  report(!res.error, name, fmt(res.error));
}
/** For reads/updates RLS hides rows instead of erroring: no error and zero rows means blocked. */
function expectNoRows(name: string, res: { data: unknown[] | null; error: PgErr }) {
  if (res.error) return report(true, name); // an error is also a refusal
  report((res.data ?? []).length === 0, name, `returned ${(res.data ?? []).length} row(s)`);
}

// ---------------------------------------------------------------------------- users
interface TestUser {
  label: string;
  id: string;
  email: string;
  db: SupabaseClient;
}
const created: { id: string; email: string }[] = [];

async function makeUser(label: string): Promise<TestUser> {
  const email = `${TAG}-${label.toLowerCase()}-${RUN}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: `RLS ${label}` } });
  if (error || !data.user) throw new Fatal(`create test user ${label}: ${fmt(error)}`);
  created.push({ id: data.user.id, email });
  return { label, id: data.user.id, email, db: await signIn(email) };
}

/** Sign in AS the user with the anon key: one-time magic-link token, no password, no email sent. */
async function signIn(email: string): Promise<SupabaseClient> {
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw new Fatal(`magic link for ${email}: ${fmt(link.error)}`);
  const db = createClient(URL, ANON, opts);
  const { error } = await db.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "magiclink" });
  if (error) throw new Fatal(`sign in ${email}: ${fmt(error)}`);
  return db;
}

/** Device secrets used in this run, so cleanup can remove their pairing codes. */
const secrets: string[] = [];
const secret = () => {
  const s = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
  secrets.push(s);
  return s;
};
// 1x1 WebP
const WEBP = Uint8Array.from(Buffer.from("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==", "base64"));
const kuliahFields = { series: "Kuliah Maghrib", topic: "[RLS check]", speaker: "[Ustaz]", date: "[Tarikh]", time: "[Masa]", venue: "[Dewan]" };
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

// ---------------------------------------------------------------------------- cleanup
async function cleanup(orgIds: string[]) {
  console.log("\nCleanup");
  // Also sweep leftovers from earlier interrupted runs.
  const { data: oldOrgs } = await admin.from("organisations").select("id").like("full_name", "RLS Check %");
  const ids = [...new Set([...orgIds, ...(oldOrgs ?? []).map((o) => o.id as string)])];
  for (const id of ids) {
    const { data: files } = await admin.storage.from("media").list(id, { limit: 1000 });
    if (files?.length) await admin.storage.from("media").remove(files.map((f) => `${id}/${f.name}`));
  }
  if (ids.length) {
    // Order matters: slides reference media (on delete restrict); members must go with their org.
    await admin.from("slides").delete().in("org_id", ids);
    await admin.from("media").delete().in("org_id", ids);
    // Usage telemetry has no foreign keys (migration 0008); harmless if the table does not exist yet.
    await admin.from("usage_screen_daily").delete().in("org_id", ids);
    const del = await admin.from("organisations").delete().in("id", ids);
    if (del.error) console.log(`  could not delete test orgs: ${fmt(del.error)}`);
  }
  if (secrets.length) {
    const hashes = secrets.map((s) => createHash("sha256").update(s).digest("hex"));
    await admin.from("pairing_codes").delete().in("device_secret_hash", hashes);
  }
  // Users (cascades profiles, members, platform_admins, pair_attempts).
  const users: { id: string; email: string }[] = [...created];
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const batch = data?.users ?? [];
    for (const u of batch) if (u.email?.startsWith(`${TAG}-`) && !users.some((x) => x.id === u.id)) users.push({ id: u.id, email: u.email });
    if (batch.length < 200) break;
  }
  for (const u of users) {
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (error) console.log(`  could not delete user ${u.email}: ${fmt(error)}`);
  }
  console.log(`  removed ${ids.length} test org(s) and ${users.length} test user(s)`);
}

// ---------------------------------------------------------------------------- checks
async function run(orgIds: string[]) {
  console.log(`Project: ${new globalThis.URL(URL).host}   run: ${RUN}\n`);

  const A = await makeUser("A");
  const B = await makeUser("B");
  const C = await makeUser("C");
  const P = await makeUser("P");
  const D = await makeUser("D");

  // 1. Registration ---------------------------------------------------------
  console.log("Registration");
  const regA = await A.db.rpc("register_org", { p_kind: "masjid", p_full_name: `RLS Check A ${RUN}`, p_short_name: "RA", p_state: "Selangor", p_district: "Petaling", p_zone: "SGR01" });
  expectOk("A registers org A (register_org)", regA);
  const regB = await B.db.rpc("register_org", { p_kind: "surau", p_full_name: `RLS Check B ${RUN}`, p_short_name: "RB", p_state: "Selangor", p_district: "Gombak", p_zone: "SGR01" });
  expectOk("B registers org B (register_org)", regB);
  if (regA.error || regB.error) throw new Fatal("registration failed; later checks depend on it");
  const orgA = regA.data as string;
  const orgB = regB.data as string;
  orgIds.push(orgA, orgB);
  expectFail("A calls register_org a second time -> already_has_org",
    await A.db.rpc("register_org", { p_kind: "masjid", p_full_name: `RLS Check A2 ${RUN}`, p_short_name: "RA2", p_state: "Selangor", p_district: "Petaling", p_zone: "SGR01" }), "already_has_org");
  expectFail("A cannot insert rows into members directly (adding D to org A)", await A.db.from("members").insert({ org_id: orgA, user_id: D.id, role: "pentadbir" }).select("user_id"));

  // 2. Before approval --------------------------------------------------------
  console.log("\nBefore approval (org A pending)");
  expectFail("A cannot insert a slide while org A is pending",
    await A.db.from("slides").insert({ org_id: orgA, type: "template", template_key: "kuliah", fields: kuliahFields }).select("id"));
  expectOk("A can upload a logo file to storage path A/… while pending",
    await A.db.storage.from("media").upload(`${orgA}/logo-${RUN}.webp`, WEBP, { contentType: "image/webp" }));

  // 3. Approval ----------------------------------------------------------------
  console.log("\nApproval");
  must("make P a platform admin", await admin.from("platform_admins").insert({ user_id: P.id }));
  const apA = await P.db.rpc("review_org", { p_org: orgA, p_action: "approve" });
  report(apA.data === "active", "P approves org A (review_org)", fmt(apA.error));
  const apB = await P.db.rpc("review_org", { p_org: orgB, p_action: "approve" });
  report(apB.data === "active", "P approves org B (review_org)", fmt(apB.error));
  if (apA.data !== "active" || apB.data !== "active") throw new Fatal("approval failed; later checks depend on it");
  expectFail("A (not a platform admin) cannot approve orgs", await A.db.rpc("review_org", { p_org: orgB, p_action: "suspend", p_reason: "x" }));

  // Platform list (migration 0003): registrant e-mails for platform owners only.
  const plP = await P.db.rpc("platform_org_list");
  const rowA = (plP.data as { id: string; registrant_email: string | null; status: string }[] | null)?.find((r) => r.id === orgA);
  report(!plP.error && rowA?.registrant_email === A.email && rowA?.status === "active", "P lists orgs with the registrant's e-mail (platform_org_list)", fmt(plP.error));
  expectFail("A (not a platform admin) cannot call platform_org_list", await A.db.rpc("platform_org_list"), "not_allowed");
  expectFail("anon cannot call platform_org_list", await anon.rpc("platform_org_list"));

  // Data in org B for the isolation checks (created by B itself).
  const bSlide = must("B creates a slide", await B.db.from("slides").insert({ org_id: orgB, type: "template", template_key: "kuliah", fields: kuliahFields, status: "published" }).select("id").single()) as { id: string };
  const bFile = `${orgB}/poster-${RUN}.webp`;
  must("B uploads a file", await B.db.storage.from("media").upload(bFile, WEBP, { contentType: "image/webp" }));
  const bMedia = must("B adds a media row", await B.db.from("media").insert({ org_id: orgB, path: bFile, kind: "poster", width: 1, height: 1, bytes: WEBP.length, created_by: B.id }).select("id").single()) as { id: string };
  const bPair = must("B's TV pair_start", await anon.rpc("pair_start", { p_secret: secret() })) as { code: string };
  const bScreen = must("B pairs a screen", await B.db.rpc("pair_claim", { p_code: bPair.code, p_org: orgB, p_name: "TV B" })) as string;

  // 4. Org A content + isolation from org B ----------------------------------
  console.log("\nOrg A content, isolation from org B");
  const aSlide = await A.db.from("slides").insert({ org_id: orgA, type: "template", template_key: "kuliah", fields: kuliahFields, status: "published" }).select("id").single();
  expectOk("A can create a kuliah slide in org A", aSlide);

  expectNoRows("A cannot read org B's organisation row", await A.db.from("organisations").select("id").eq("id", orgB));
  expectNoRows("A cannot read org B's slides", await A.db.from("slides").select("id").eq("org_id", orgB));
  expectNoRows("A cannot read org B's settings", await A.db.from("org_settings").select("org_id").eq("org_id", orgB));
  expectNoRows("A cannot read org B's screens", await A.db.from("screens").select("id").eq("org_id", orgB));
  expectNoRows("A cannot read org B's media", await A.db.from("media").select("id").eq("org_id", orgB));
  expectNoRows("A cannot read org B's members", await A.db.from("members").select("user_id").eq("org_id", orgB));

  expectFail("A cannot insert a slide into org B", await A.db.from("slides").insert({ org_id: orgB, type: "template", template_key: "kuliah", fields: kuliahFields }).select("id"));
  expectFail("A cannot insert a media row into org B", await A.db.from("media").insert({ org_id: orgB, path: `${orgB}/x-${RUN}.webp`, kind: "poster", width: 1, height: 1, bytes: 10, created_by: A.id }).select("id"));
  expectFail("A cannot insert an invitation directly (only invite_member)", await A.db.from("invitations").insert({ org_id: orgA, email: `${TAG}-x-${RUN}@example.com`, invited_by: A.id }).select("id"));
  expectFail("A cannot invite someone into org B (invite_member)", await A.db.rpc("invite_member", { p_org: orgB, p_email: `${TAG}-x-${RUN}@example.com` }), "not_allowed");
  expectFail("A cannot add itself as a member of org B", await A.db.from("members").insert({ org_id: orgB, user_id: A.id, role: "pentadbir" }).select("user_id"));

  expectNoRows("A cannot update org B's slides", await A.db.from("slides").update({ fields: { hacked: true } }).eq("org_id", orgB).select("id"));
  expectNoRows("A cannot update org B's settings", await A.db.from("org_settings").update({ ticker: ["hacked"] }).eq("org_id", orgB).select("org_id"));
  expectNoRows("A cannot update org B's screens", await A.db.from("screens").update({ name: "hacked" }).eq("org_id", orgB).select("id"));
  expectNoRows("A cannot update org B's organisation", await A.db.from("organisations").update({ full_name: "hacked hacked" }).eq("id", orgB).select("id"));
  expectNoRows("A cannot delete org B's slides", await A.db.from("slides").delete().eq("org_id", orgB).select("id"));
  expectNoRows("A cannot delete org B's media rows", await A.db.from("media").delete().eq("org_id", orgB).select("id"));

  expectFail("A cannot upload to storage path B/…", await A.db.storage.from("media").upload(`${orgB}/evil-${RUN}.webp`, WEBP, { contentType: "image/webp" }));
  const list = await A.db.storage.from("media").list(orgB);
  report(!list.error && (list.data ?? []).length === 0, "A cannot list storage path B/…", list.error ? fmt(list.error) : `listed ${(list.data ?? []).length} file(s)`);
  // The bucket is public by design (PRD §7: the TV needs it; paths are unguessable UUIDs), so a
  // known path is readable by anyone. What protects other orgs is that paths cannot be listed (above).
  const dl = await A.db.storage.from("media").download(bFile);
  report(!dl.error, "A can download B/… only with its exact path (public bucket by design, PRD §7; listing is blocked)", fmt(dl.error));
  await A.db.storage.from("media").remove([bFile]);
  expectFail("A cannot point org A's logo at a file in B/… (set_org_logo)", await A.db.rpc("set_org_logo", { p_org: orgA, p_path: bFile }));

  // Verify with the service role that B's data is untouched.
  // Playlist order (migration 0005): only members of the masjid can reorder its slides.
  const aSlideId = (aSlide.data as { id: string } | null)?.id;
  if (aSlideId) {
    const own = await A.db.rpc("reorder_slides", { p_org: orgA, p_ids: [aSlideId] });
    report(!own.error, "A can reorder org A's slides (reorder_slides)", fmt(own.error));
  }
  expectFail("A cannot reorder org B's slides (reorder_slides)", await A.db.rpc("reorder_slides", { p_org: orgB, p_ids: [bSlide.id] }), "not_allowed");
  const sneaky = await A.db.rpc("reorder_slides", { p_org: orgA, p_ids: [bSlide.id] });
  report(!sneaky.error && sneaky.data === 0, "A cannot move org B's slide by passing it under org A (0 rows changed)", fmt(sneaky.error) || `changed ${String(sneaky.data)}`);
  expectFail("anon cannot call reorder_slides", await anon.rpc("reorder_slides", { p_org: orgB, p_ids: [bSlide.id] }));

  const bAfter = await admin.from("slides").select("fields").eq("id", bSlide.id).single();
  report(!(bAfter.data?.fields as Record<string, unknown> | undefined)?.hacked, "Org B's slide is unchanged (checked with service role)");
  const bScreenAfter = await admin.from("screens").select("name").eq("id", bScreen).single();
  report(bScreenAfter.data?.name === "TV B", "Org B's screen is unchanged (checked with service role)");
  const bFiles = await admin.storage.from("media").list(orgB);
  report((bFiles.data ?? []).some((f) => bFile.endsWith(f.name)) && !(bFiles.data ?? []).some((f) => f.name.startsWith("evil-")), "Org B's storage folder is unchanged (checked with service role)");
  const bMediaAfter = await admin.from("media").select("id").eq("id", bMedia.id);
  report((bMediaAfter.data ?? []).length === 1, "Org B's media row still exists (checked with service role)");

  // Own files (migration 0004): members can list and really delete files in their own folder.
  const bOwn = await B.db.storage.from("media").list(orgB);
  report(!bOwn.error && (bOwn.data ?? []).some((f) => bFile.endsWith(f.name)), "B can list its own storage folder B/…", bOwn.error ? fmt(bOwn.error) : `listed ${(bOwn.data ?? []).length} file(s)`);
  const aTmp = `${orgA}/tmp-${RUN}.webp`;
  must("A uploads a temporary file", await A.db.storage.from("media").upload(aTmp, WEBP, { contentType: "image/webp" }));
  const aRm = await A.db.storage.from("media").remove([aTmp]);
  const aLeft = await admin.storage.from("media").list(orgA);
  report(!aRm.error && (aRm.data ?? []).length === 1 && !(aLeft.data ?? []).some((f) => aTmp.endsWith(f.name)), "A can really delete its own file in A/… (checked with service role)", aRm.error ? fmt(aRm.error) : `remove reported ${(aRm.data ?? []).length}`);

  // 5. Kematian rule -------------------------------------------------------------
  console.log("\nKematian");
  expectFail("kematian with ends_at more than 7 days ahead is rejected",
    await A.db.from("slides").insert({ org_id: orgA, type: "template", template_key: "kematian", fields: { name: "[Nama]" }, starts_at: inDays(0), ends_at: inDays(8) }).select("id"), "23514");
  expectFail("kematian without ends_at is rejected",
    await A.db.from("slides").insert({ org_id: orgA, type: "template", template_key: "kematian", fields: { name: "[Nama]" } }).select("id"), "23514");
  expectOk("kematian ending in 3 days is accepted",
    await A.db.from("slides").insert({ org_id: orgA, type: "template", template_key: "kematian", fields: { name: "[Nama]" }, starts_at: inDays(0), ends_at: inDays(3) }).select("id"));

  // 6. Second admin (v0.3: up to 2 equal admins, one masjid per account) -------
  console.log("\nSecond admin");
  expectFail("A invite_member(org A, B's email) -> user_has_org", await A.db.rpc("invite_member", { p_org: orgA, p_email: B.email }), "user_has_org");
  expectOk("A invites C -> ok", await A.db.rpc("invite_member", { p_org: orgA, p_email: C.email }));
  expectFail("A invites D while C's invitation is open -> invite_pending", await A.db.rpc("invite_member", { p_org: orgA, p_email: D.email }), "invite_pending");
  expectFail("B invite_member into org A -> not_allowed", await B.db.rpc("invite_member", { p_org: orgA, p_email: D.email }), "not_allowed");
  const acc = await C.db.rpc("accept_invitations");
  report(!acc.error && acc.data === orgA, "C signs in -> accept_invitations returns org A", acc.error ? fmt(acc.error) : `returned ${JSON.stringify(acc.data)}`);
  const cSet = await C.db.from("org_settings").update({ ticker: ["[C]"] }).eq("org_id", orgA).select("org_id");
  report(!cSet.error && (cSet.data ?? []).length === 1, "C can update org A settings (equal admin)", fmt(cSet.error));
  expectFail("C register_org -> already_has_org",
    await C.db.rpc("register_org", { p_kind: "surau", p_full_name: `RLS Check C ${RUN}`, p_short_name: "RC", p_state: "Selangor", p_district: "Gombak", p_zone: "SGR01" }), "already_has_org");
  expectFail("C invites D -> org_full", await C.db.rpc("invite_member", { p_org: orgA, p_email: D.email }), "org_full");
  const bSees = await B.db.rpc("org_members", { p_org: orgA });
  report(!bSees.error && (bSees.data ?? []).length === 0, "B cannot read org_members(org A)", bSees.error ? fmt(bSees.error) : `saw ${(bSees.data ?? []).length} row(s)`);
  const aSees = (await A.db.rpc("org_members", { p_org: orgA })).data as { email: string; is_me: boolean }[] | null;
  report((aSees ?? []).length === 2 && (aSees ?? []).some((m) => m.email === A.email && m.is_me), "A reads org_members(org A): 2 admins, own row marked is_me");
  expectNoRows("B cannot delete org A members", await B.db.from("members").delete().eq("org_id", orgA).eq("user_id", C.id).select("user_id"));
  const rmC = await A.db.from("members").delete().eq("org_id", orgA).eq("user_id", C.id).select("user_id");
  report(!rmC.error && (rmC.data ?? []).length === 1, "A removes C -> ok", fmt(rmC.error));
  expectFail("A removes self as the last admin -> last_pentadbir", await A.db.from("members").delete().eq("org_id", orgA).eq("user_id", A.id).select("user_id"), "last_pentadbir");

  // 7. Pairing --------------------------------------------------------------------
  console.log("\nPairing");
  const tvSecret = secret();
  const start = await anon.rpc("pair_start", { p_secret: tvSecret });
  const code = (start.data as { status?: string; code?: string } | null)?.code;
  report(!start.error && /^[0-9]{6}$/.test(code ?? ""), "anon pair_start → 6-digit code", start.error ? fmt(start.error) : JSON.stringify(start.data));
  if (!code) throw new Fatal("no pairing code; later checks depend on it");
  const wrong = code === "000000" ? "000001" : "000000";
  const wrongClaim = await A.db.rpc("pair_claim", { p_code: wrong, p_org: orgA, p_name: "TV A" });
  report(!wrongClaim.error && wrongClaim.data === null, "A pair_claim with a wrong code fails (returns null, migration 0002)",
    wrongClaim.error ? `raised ${fmt(wrongClaim.error)} — has migration 0002 been run?` : `returned ${JSON.stringify(wrongClaim.data)}`);
  const claim = await A.db.rpc("pair_claim", { p_code: code, p_org: orgA, p_name: "TV A", p_theme: "alam", p_layout: "bottom" });
  expectOk("A pair_claim with the right code succeeds", claim);
  const screenA = claim.data as string;
  const status = await anon.rpc("pair_status", { p_secret: tvSecret });
  report((status.data as { status?: string } | null)?.status === "paired", "anon pair_status → paired", JSON.stringify(status.data ?? status.error));
  const cStart = await anon.rpc("pair_start", { p_secret: secret() });
  const cCode = (cStart.data as { code?: string } | null)?.code ?? "";
  expectFail("D (no masjid) pair_claim for org A fails", await D.db.rpc("pair_claim", { p_code: cCode, p_org: orgA, p_name: "TV D" }), "not_allowed");
  expectNoRows("D (no masjid) cannot update org A's screens", await D.db.from("screens").update({ name: "D" }).eq("id", screenA).select("id"));
  expectFail("A cannot pair a TV into org B", await A.db.rpc("pair_claim", { p_code: cCode, p_org: orgB, p_name: "TV X" }), "not_allowed");
  expectNoRows("anon cannot read the screens table directly", await anon.from("screens").select("id").limit(5));
  expectNoRows("anon cannot read the pairing_codes table directly", await anon.from("pairing_codes").select("code").limit(5));

  // Extra (PRD §10): brute-force limit of 10 failed pair_claim attempts per user per hour.
  // Uses P (an active admin is needed) so A is unaffected.
  const pReg = must("P registers an org for the limit check", await P.db.rpc("register_org", { p_kind: "surau", p_full_name: `RLS Check P ${RUN}`, p_short_name: "RP", p_state: "Selangor", p_district: "Klang", p_zone: "SGR01" })) as string;
  orgIds.push(pReg);
  must("P approves its own org", await P.db.rpc("review_org", { p_org: pReg, p_action: "approve" }));
  for (let i = 0; i < 10; i++) await P.db.rpc("pair_claim", { p_code: String(100000 + i), p_org: pReg, p_name: "x" });
  // Note: with 0002 a wrong code returns null (not an error), so each of these is recorded.
  const recorded = await admin.from("pair_attempts").select("id", { count: "exact", head: true }).eq("user_id", P.id);
  expectFail(`after 10 wrong codes the 11th pair_claim is refused (too_many_attempts) [extra, PRD §10] — failed attempts recorded: ${recorded.count ?? "?"}`,
    await P.db.rpc("pair_claim", { p_code: "199999", p_org: pReg, p_name: "x" }), "too_many_attempts");

  await round2Checks(A, orgA);

  // 8. screen_bundle --------------------------------------------------------------
  console.log("\nScreen bundle (TV sync)");
  const b1 = await anon.rpc("screen_bundle", { p_secret: tvSecret, p_since: 0 });
  const v1 = (b1.data as { status?: string; version?: number } | null)?.version ?? 0;
  report((b1.data as { status?: string } | null)?.status === "ok" && v1 > 0, "anon screen_bundle → status ok + version", JSON.stringify((b1.data as object) ?? b1.error).slice(0, 160));
  const slidesInBundle = ((b1.data as { slides?: { templateKey?: string }[] } | null)?.slides ?? []).length;
  report(slidesInBundle >= 1, "bundle contains org A's published slide", `${slidesInBundle} slide(s)`);
  const b2 = await anon.rpc("screen_bundle", { p_secret: tvSecret, p_since: v1 });
  report((b2.data as { status?: string } | null)?.status === "unchanged", "second call with that version → unchanged", JSON.stringify(b2.data ?? b2.error));
  await usageChecks(A, P, screenA);
  await fullscreenFeedbackChecks(A, B, P, orgA, orgB, tvSecret, screenA);
  const iq = await A.db.from("org_settings").update({ iqamah_min: { subuh: 10, zohor: 10, asar: 10, maghrib: 9, isyak: 10 } }).eq("org_id", orgA).select("org_id");
  report(!iq.error && (iq.data ?? []).length === 1, "A updates org A's iqamah minutes", fmt(iq.error));
  const b3 = await anon.rpc("screen_bundle", { p_secret: tvSecret, p_since: v1 });
  const v3 = (b3.data as { version?: number } | null)?.version ?? 0;
  report((b3.data as { status?: string } | null)?.status === "ok" && v3 > v1, "after the iqamah change the version increases", `v${v1} → v${v3}`);
  const maghrib = (b3.data as { settings?: { iqamahMin?: { maghrib?: number } } } | null)?.settings?.iqamahMin?.maghrib;
  report(maghrib === 9, "bundle carries the new Maghrib iqamah (9)", `maghrib = ${maghrib}`);
  // Friday settings (PRD §4.6): Tetapan merges the changed keys into durations, never overwriting the rest.
  const curDur = await A.db.from("org_settings").select("durations").eq("org_id", orgA).single();
  const before = (curDur.data?.durations ?? {}) as Record<string, unknown>;
  const dur = await A.db.from("org_settings").update({ durations: { ...before, jumaatSolatMin: 20, showFridayInfo: false } }).eq("org_id", orgA).select("org_id");
  report(!dur.error && (dur.data ?? []).length === 1, "A saves org A's Jumaat settings (durations merge)", fmt(dur.error ?? curDur.error));
  const b5 = await anon.rpc("screen_bundle", { p_secret: tvSecret, p_since: v3 });
  const v5 = (b5.data as { version?: number } | null)?.version ?? 0;
  report((b5.data as { status?: string } | null)?.status === "ok" && v5 > v3, "saving durations bumps bundle_version", `v${v3} → v${v5}`);
  const bd = ((b5.data as { settings?: { durations?: Record<string, unknown> } } | null)?.settings?.durations ?? {}) as Record<string, unknown>;
  report(bd.jumaatSolatMin === 20 && bd.showFridayInfo === false && bd.khutbahMin === before.khutbahMin && bd.preAzanMin === before.preAzanMin,
    "bundle carries jumaatSolatMin 20 + showFridayInfo false, other keys kept", JSON.stringify(bd));
  const bDur = await B.db.from("org_settings").update({ durations: { khutbahMin: 10 } }).eq("org_id", orgA).select("org_id");
  report(!bDur.error && (bDur.data ?? []).length === 0, "B cannot change org A's durations (0 rows)", fmt(bDur.error));
  const rev = await A.db.from("screens").update({ revoked_at: new Date().toISOString() }).eq("id", screenA).select("id");
  report(!rev.error && (rev.data ?? []).length === 1, "A revokes the screen", fmt(rev.error));
  const b4 = await anon.rpc("screen_bundle", { p_secret: tvSecret, p_since: v5 });
  report((b4.data as { status?: string } | null)?.status === "revoked", "after revoke → revoked", JSON.stringify(b4.data ?? b4.error));
  const bOther = await anon.rpc("screen_bundle", { p_secret: secret(), p_since: 0 });
  report((bOther.data as { status?: string } | null)?.status === "revoked", "an unknown device secret gets nothing (revoked)", JSON.stringify(bOther.data ?? bOther.error));

  // 9. Last admin ----------------------------------------------------------------
  console.log("\nLast admin");
  expectFail("removing the last admin fails", await A.db.from("members").delete().eq("org_id", orgA).eq("user_id", A.id).select("user_id"), "last_pentadbir");
  expectNoRows("members rows cannot be changed by users (no update policy)", await A.db.from("members").update({ created_at: new Date().toISOString() }).eq("org_id", orgA).eq("user_id", A.id).select("user_id"));
  const stillA = await admin.from("members").select("role").eq("org_id", orgA).eq("user_id", A.id).single();
  report(stillA.data?.role === "pentadbir", "A is still admin of org A (checked with service role)");

  // 10. Rejected registration can be replaced ----------------------------------------
  console.log("\nRejected registration");
  const rej = await P.db.rpc("review_org", { p_org: orgB, p_action: "reject", p_reason: "[RLS check]" });
  report(rej.data === "rejected", "P rejects org B", fmt(rej.error));
  const reB = await B.db.rpc("register_org", { p_kind: "surau", p_full_name: `RLS Check B2 ${RUN}`, p_short_name: "RB2", p_state: "Selangor", p_district: "Gombak", p_zone: "SGR01" });
  if (reB.data) orgIds.push(reB.data as string);
  const oldB = await admin.from("organisations").select("id").eq("id", orgB);
  report(!reB.error && (oldB.data ?? []).length === 0, "B registers again -> succeeds and the rejected org is gone", reB.error ? fmt(reB.error) : `old org rows: ${(oldB.data ?? []).length}`);

  // 11. transfer_org (platform owner only) ---------------------------------------------
  console.log("\ntransfer_org");
  expectFail("A calls transfer_org -> not_allowed", await A.db.rpc("transfer_org", { p_org: orgA, p_email: D.email }), "not_allowed");
  expectOk("P adds D to org A (1 admin) -> ok", await P.db.rpc("transfer_org", { p_org: orgA, p_email: D.email }));
  expectFail("P adds C to org A (already 2) -> org_full", await P.db.rpc("transfer_org", { p_org: orgA, p_email: C.email }), "org_full");
  expectOk("P replaces A by C -> ok", await P.db.rpc("transfer_org", { p_org: orgA, p_email: C.email, p_replace_email: A.email }));
  const cOrgs = await C.db.from("members").select("org_id").eq("user_id", C.id);
  const aOrgs = await A.db.from("members").select("org_id").eq("user_id", A.id);
  report((cOrgs.data ?? []).some((m) => m.org_id === orgA) && (aOrgs.data ?? []).length === 0, "after the replace: C sees org A, A sees no masjid", `C: ${(cOrgs.data ?? []).length}, A: ${(aOrgs.data ?? []).length}`);
  expectFail("P adds an email that already manages a masjid (B) -> user_has_org", await P.db.rpc("transfer_org", { p_org: orgA, p_email: B.email }), "user_has_org");
}

// Themes round 2 (migration 0009, _specs/40-PRD-themes-round2.md §7): the new theme ids and the
// `poster` layout, and slide targeting between a full screen and a poster screen of one masjid.
// Every screen paired here belongs to org A, so cleanup (org delete + pairing codes) removes it.
type Bundle = { status?: string; screen?: { theme?: string; layout?: string }; slides?: { id?: string }[] } | null;
async function round2Checks(A: TestUser, orgA: string) {
  console.log("\nThemes round 2 (migration 0009)");
  /** Pairs a new TV into org A; returns its secret and screen id (null when pair_claim failed). */
  const pairTv = async (theme: string, layout: string) => {
    const tv = secret();
    const start = must(`pair_start (${theme}/${layout})`, await anon.rpc("pair_start", { p_secret: tv })) as { code: string };
    const res = await A.db.rpc("pair_claim", { p_code: start.code, p_org: orgA, p_name: `TV ${theme} ${layout}`, p_theme: theme, p_layout: layout });
    return { tv, res, screen: (res.data as string | null) ?? null };
  };
  const bundle = async (tv: string) => (await anon.rpc("screen_bundle", { p_secret: tv, p_since: 0 })).data as Bundle;

  let fullTv = "";
  for (const theme of ["falak", "garis", "kerawang", "seterusnya"]) {
    const { tv, res, screen } = await pairTv(theme, "full");
    if (res.error?.code === "22P02") {
      report(false, `pair_claim accepts theme ${theme}`, "invalid enum value — apply supabase/migrations/0009_themes_round2.sql first");
      return;
    }
    report(!res.error && !!screen, `pair_claim accepts theme ${theme}`, fmt(res.error));
    const b = await bundle(tv);
    report(b?.screen?.theme === theme && b?.screen?.layout === "full", `screen_bundle returns theme "${theme}"`, JSON.stringify(b?.screen ?? b));
    if (theme === "falak") fullTv = tv;
  }

  const poster = await pairTv("tenang", "poster");
  report(!poster.res.error && !!poster.screen, "pair_claim accepts layout poster", fmt(poster.res.error));
  const pb = await bundle(poster.tv);
  report(pb?.screen?.layout === "poster", 'screen_bundle returns layout "poster"', JSON.stringify(pb?.screen ?? pb));

  // Rejected by the enum before pair_claim runs, so no pairing attempt is used up.
  const bad = await pairTv("banana", "full");
  expectFail("pair_claim rejects an unknown theme (banana)", bad.res, "22P02");
  const badLayout = await pairTv("tenang", "carousel");
  expectFail("pair_claim rejects an unknown layout (carousel)", badLayout.res, "22P02");

  if (!poster.screen || !fullTv) return;
  const target = await A.db
    .from("slides")
    .insert({ org_id: orgA, type: "template", template_key: "kuliah", fields: kuliahFields, status: "published", screen_ids: [poster.screen] })
    .select("id")
    .single();
  expectOk("A creates a slide targeted only to the poster screen", target);
  const id = (target.data as { id: string } | null)?.id;
  if (!id) return;
  const onFull = (await bundle(fullTv))?.slides ?? [];
  report(!onFull.some((sl) => sl.id === id), "the targeted slide is NOT in the full screen's bundle", `${onFull.length} slide(s) in the full screen's bundle`);
  const onPoster = (await bundle(poster.tv))?.slides ?? [];
  report(onPoster.some((sl) => sl.id === id), "the targeted slide IS in the poster screen's bundle", `${onPoster.length} slide(s) in the poster screen's bundle`);
}

// TV full-screen status and admin feedback (migration 0010). B is still a member of org B here.
async function fullscreenFeedbackChecks(A: TestUser, B: TestUser, P: TestUser, orgA: string, orgB: string, tvSecret: string, screenA: string) {
  console.log("\nFull-screen status + feedback (migration 0010)");
  const probe = await A.db.rpc("send_feedback", { p_org: orgA, p_message: `[RLS check] ${RUN}`, p_page: "/admin/maklum-balas/", p_app_version: "rls-check" });
  if (probe.error?.code === "PGRST202") {
    report(false, "migration 0010 is applied", "send_feedback not found — apply supabase/migrations/0010_fullscreen_feedback.sql first");
    return;
  }
  report(!probe.error && typeof probe.data === "string", "A sends feedback for org A (send_feedback)", fmt(probe.error));
  expectOk("A can send a second feedback", await A.db.rpc("send_feedback", { p_org: orgA, p_message: "Kedua" }));
  expectFail("A cannot send feedback as org B", await A.db.rpc("send_feedback", { p_org: orgB, p_message: "x" }), "not_allowed");
  expectFail("an empty feedback is rejected", await A.db.rpc("send_feedback", { p_org: orgA, p_message: "   " }), "empty_message");
  expectFail("anon cannot execute send_feedback", await anon.rpc("send_feedback", { p_org: orgA, p_message: "x" }), "42501");
  expectFail("A cannot insert into feedback directly", await A.db.from("feedback").insert({ org_id: orgA, user_id: A.id, message: "direct" }).select("id"));
  const own = await A.db.from("feedback").select("message").order("created_at");
  report(!own.error && (own.data ?? []).length === 2, "A reads its own 2 feedback rows", own.error ? fmt(own.error) : `${(own.data ?? []).length} row(s)`);
  expectNoRows("B cannot read A's feedback", await B.db.from("feedback").select("id").eq("user_id", A.id));
  expectNoRows("anon cannot read feedback", await anon.from("feedback").select("id").limit(5));
  const all = await P.db.rpc("platform_feedback");
  const row = ((all.data ?? []) as { message: string; org_name: string | null; sender_email: string | null }[]).find((r) => r.message === `[RLS check] ${RUN}`);
  report(!all.error && row?.sender_email === A.email && Boolean(row?.org_name), "P (platform owner) platform_feedback → message with masjid name and sender e-mail", all.error ? fmt(all.error) : JSON.stringify(row ?? null));
  expectFail("A (not a platform owner) platform_feedback → not_allowed", await A.db.rpc("platform_feedback"), "not_allowed");
  expectFail("anon cannot execute platform_feedback", await anon.rpc("platform_feedback"), "42501");

  const tab = await anon.rpc("screen_bundle", { p_secret: tvSecret, p_since: 0, p_app_version: "rls-check", p_view_mode: "tab" });
  const mode1 = (await admin.from("screens").select("view_mode").eq("id", screenA).single()).data?.view_mode;
  report(!tab.error && mode1 === "tab", "screen_bundle stores the TV's view mode (tab)", tab.error ? fmt(tab.error) : `view_mode = ${mode1}`);
  const bad = await anon.rpc("screen_bundle", { p_secret: tvSecret, p_since: 0, p_app_version: "rls-check", p_view_mode: "banana" });
  const mode2 = (await admin.from("screens").select("view_mode").eq("id", screenA).single()).data?.view_mode;
  report(!bad.error && mode2 === "tab", "an unknown view mode is ignored (stays tab)", bad.error ? fmt(bad.error) : `view_mode = ${mode2}`);
  const old = await anon.rpc("screen_bundle", { p_secret: tvSecret, p_since: 0, p_app_version: "rls-check" });
  report(!old.error && (old.data as { status?: string } | null)?.status === "ok", "an older TV (3 arguments, no view mode) still syncs", fmt(old.error));
}

// Usage monitoring (migration 0008, _specs/30-PRD-usage.md §10.1). Runs after the screen above
// has made one full and one unchanged screen_bundle call.
async function usageChecks(A: TestUser, P: TestUser, screenA: string) {
  console.log("\nUsage monitoring (migration 0008)");
  const own = await P.db.rpc("platform_usage");
  if (own.error?.code === "PGRST202") {
    report(false, "migration 0008 (usage) is applied", "platform_usage not found — apply supabase/migrations/0008_usage.sql first");
    return;
  }
  const keys = Object.keys((own.data as Record<string, unknown> | null) ?? {});
  const want = ["cycle", "live", "cycle_to_date", "settings"];
  report(!own.error && want.every((k) => keys.includes(k)), "P (platform owner) platform_usage → JSON with cycle, live, cycle_to_date, settings",
    own.error ? fmt(own.error) : `keys: ${keys.join(", ")}`);
  expectFail("A (not a platform owner) platform_usage → not_allowed", await A.db.rpc("platform_usage"), "not_allowed");

  const denied = "42501"; // permission denied for function
  expectFail("anon cannot execute platform_usage", await anon.rpc("platform_usage"), denied);
  expectFail("anon cannot execute usage_report", await anon.rpc("usage_report"), denied);
  expectFail("anon cannot execute usage_note_ping",
    await anon.rpc("usage_note_ping", { p_screen: screenA, p_org: screenA, p_full: true, p_body_bytes: 1 }), denied);
  expectFail("anon cannot execute usage_set_emails", await anon.rpc("usage_set_emails", { p_day: "2000-01-01", p_sent: 1 }), denied);
  expectFail("anon cannot execute usage_mark_alert", await anon.rpc("usage_mark_alert", { p_metric: "rls-check", p_level: "warn" }), denied);

  const row = await admin.from("usage_screen_daily").select("pings").eq("screen_id", screenA);
  const pings = (row.data ?? []).reduce((n, r) => n + Number(r.pings), 0);
  report(!row.error && pings >= 1, "screen_bundle counts the TV in usage_screen_daily (pings ≥ 1, checked with service role)",
    row.error ? fmt(row.error) : `${(row.data ?? []).length} row(s), pings = ${pings}`);

  const tomorrow = new Date(Date.now() + (8 + 24) * 3_600_000).toISOString().slice(0, 10); // Malaysian date + 1
  expectFail("usage_calibrate with tomorrow's date → bad_date",
    await P.db.rpc("usage_calibrate", { p_measured_on: tomorrow, p_egress_gb: 1 }), "bad_date");
}

async function main() {
  const orgIds: string[] = [];
  let fatal: string | null = null;
  try {
    await run(orgIds);
  } catch (e) {
    fatal = e instanceof Fatal ? e.message : `unexpected error: ${(e as Error).message}`;
    console.log(`\nSTOPPED: ${fatal}`);
  } finally {
    await cleanup(orgIds);
  }
  console.log(`\n${passed} passed, ${failed} failed${fatal ? " (stopped early)" : ""}`);
  if (failures.length) console.log(`\nFailed:\n${failures.map((f) => `  - ${f}`).join("\n")}`);
  process.exit(failed || fatal ? 1 : 0);
}

main();