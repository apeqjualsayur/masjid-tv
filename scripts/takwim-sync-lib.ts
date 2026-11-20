// Pure parts of the weekly takwim check (scripts/takwim-sync.ts, PRD enhancements §5.2 / E12): read
// JAKIM's "Tarikh-tarikh Penting dalam Islam" lists, propose missing future dates, and build the report
// that asks the platform owner to review. Never overwrites a row the owner entered or confirmed.

export const EVENT_KEYS = [
  "awal_muharram", "maulidur_rasul", "israk_mikraj", "nisfu_syaaban", "awal_ramadan",
  "nuzul_quran", "aidilfitri", "hari_arafah", "aidiladha",
] as const;
export type EventKey = (typeof EVENT_KEYS)[number];

/** Hijri month numbers (1 = Muharram) and the event each (month, day) is. */
const HIJRI_MONTHS: Record<string, number> = {
  muharam: 1, muharram: 1, safar: 2, rabiulawal: 3, rabiulakhir: 4, jamadilawal: 5, jamadilakhir: 6,
  rejab: 7, syaaban: 8, ramadan: 9, syawal: 10, zulkaedah: 11, zulhijah: 12, zulhijjah: 12,
};
const EVENT_AT: Record<string, EventKey> = {
  "1/1": "awal_muharram", "3/12": "maulidur_rasul", "7/27": "israk_mikraj", "8/15": "nisfu_syaaban",
  "9/1": "awal_ramadan", "9/17": "nuzul_quran", "10/1": "aidilfitri", "12/9": "hari_arafah", "12/10": "aidiladha",
};
/** The Hijri day/month of each event, for the cross-check. */
export const EVENT_HIJRI: Record<EventKey, { day: number; month: number }> = {
  awal_muharram: { day: 1, month: 1 }, maulidur_rasul: { day: 12, month: 3 }, israk_mikraj: { day: 27, month: 7 },
  nisfu_syaaban: { day: 15, month: 8 }, awal_ramadan: { day: 1, month: 9 }, nuzul_quran: { day: 17, month: 9 },
  aidilfitri: { day: 1, month: 10 }, hari_arafah: { day: 9, month: 12 }, aidiladha: { day: 10, month: 12 },
};
const BULAN: Record<string, number> = { januari: 1, februari: 2, mac: 3, april: 4, mei: 5, jun: 6, julai: 7, ogos: 8, september: 9, oktober: 10, november: 11, disember: 12 };

const pad = (n: number) => String(n).padStart(2, "0");
export const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export interface PdfLink { url: string; kind: "penting" | "takwim"; year: number }

/** PDF links on JAKIM's e-Solat download page: the "Tarikh Penting" lists and the day grids, by year. */
export function findPdfLinks(html: string, base: string): PdfLink[] {
  const out: PdfLink[] = [];
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+\.pdf)["']/gi)) {
    const href = m[1];
    const name = decodeURIComponent(href.split("/").pop() ?? "");
    const year = Number(/(20\d{2})/.exec(name)?.[1]);
    if (!year) continue;
    const kind = /penting/i.test(name) ? "penting" : /takwim/i.test(name) ? "takwim" : null;
    if (!kind) continue;
    out.push({ url: new URL(href, base).href, kind, year });
  }
  return out.filter((l, i, a) => a.findIndex((x) => x.url === l.url) === i);
}

export interface Proposal {
  event_key: EventKey;
  hijri_year: number;
  greg_date: string;
  /** Marked * by JAKIM: declared by the Penyimpan Mohor Besar Raja-Raja. */
  declared: boolean;
  source: string;
}

/**
 * Lines of a "Tarikh Penting" list → proposals. Each row reads "[*] 27 Rejab 1450  14 Disember 2028
 * Israk dan Mikraj"; the event is told by its Hijri date (labels vary between years). "1 Zulhijah"
 * gives Hari Arafah (+8 days) when the list has no 9 Zulhijah row.
 */
export function parsePenting(lines: string[], source: string): Proposal[] {
  const row = /(\*)?\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*H?\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/;
  const out: Proposal[] = [];
  for (const line of lines) {
    const m = row.exec(line.replace(/\s+/g, " "));
    if (!m) continue;
    const hDay = Number(m[2]);
    const hMonth = HIJRI_MONTHS[m[3].toLowerCase()];
    const hYear = Number(m[4]);
    const gMonth = BULAN[m[6].toLowerCase()];
    if (!hMonth || !gMonth) continue;
    const date = `${m[7]}-${pad(gMonth)}-${pad(Number(m[5]))}`;
    if (Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).getUTCDate() !== Number(m[5])) continue;
    const key = EVENT_AT[`${hMonth}/${hDay}`];
    if (key) out.push({ event_key: key, hijri_year: hYear, greg_date: date, declared: Boolean(m[1]), source });
    if (hMonth === 12 && hDay === 1) out.push({ event_key: "hari_arafah", hijri_year: hYear, greg_date: addDays(date, 8), declared: true, source });
  }
  // One proposal per event and year (an explicit 9 Zulhijah row wins over the derived one).
  return out.filter((p, i) => out.findIndex((q) => q.event_key === p.event_key && q.hijri_year === p.hijri_year) === i);
}

/** Umm al-Qura Hijri date of a Gregorian day (from the runtime's ICU), or null when unsupported. */
export function ummAlQura(iso: string): { day: number; month: number; year: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" }).formatToParts(new Date(`${iso}T12:00:00Z`));
    const n = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "", 10);
    const r = { day: n("day"), month: n("month"), year: n("year") };
    return Number.isFinite(r.day) && Number.isFinite(r.month) && Number.isFinite(r.year) ? r : null;
  } catch {
    return null;
  }
}

/**
 * A misread guard: the proposed date must fall within ±2 days of where the Umm al-Qura calendar puts
 * that Hijri date (Malaysia's rukyah/imkanur-rukyah dates differ from it by a day at most).
 */
export function plausible(p: Pick<Proposal, "event_key" | "hijri_year" | "greg_date">, toHijri = ummAlQura): boolean {
  const want = EVENT_HIJRI[p.event_key];
  for (let off = -2; off <= 2; off++) {
    const h = toHijri(addDays(p.greg_date, off));
    if (h && h.day === want.day && h.month === want.month && h.year === p.hijri_year) return true;
  }
  return false;
}

export interface DbRow { event_key: EventKey; hijri_year: number; greg_date: string; status: "jangkaan" | "rasmi" }

export interface Plan {
  insert: Proposal[];
  /** JAKIM says another date than the table holds: the owner decides (never overwritten). */
  differs: { proposal: Proposal; row: DbRow }[];
  /** Failed the cross-check: not inserted. */
  implausible: Proposal[];
}

/** What to add: missing rows dated today or later that pass the cross-check. */
export function plan(proposals: Proposal[], rows: DbRow[], today: string, toHijri = ummAlQura): Plan {
  const p: Plan = { insert: [], differs: [], implausible: [] };
  for (const x of proposals) {
    const row = rows.find((r) => r.event_key === x.event_key && r.hijri_year === x.hijri_year);
    if (row) {
      if (row.greg_date !== x.greg_date) p.differs.push({ proposal: x, row });
      continue;
    }
    if (x.greg_date < today) continue;
    if (!plausible(x, toHijri)) p.implausible.push(x);
    else p.insert.push(x);
  }
  return p;
}

export const LABEL: Record<EventKey, string> = {
  awal_muharram: "Awal Muharram", maulidur_rasul: "Maulidur Rasul", israk_mikraj: "Israk dan Mikraj", nisfu_syaaban: "Nisfu Syaaban",
  awal_ramadan: "Awal Ramadan", nuzul_quran: "Nuzul al-Quran", aidilfitri: "Hari Raya Aidilfitri", hari_arafah: "Hari Arafah", aidiladha: "Hari Raya Aidiladha",
};

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export interface ReportInput {
  today: string;
  rows: DbRow[];
  plan: Plan;
  inserted: boolean;
  /** "Tarikh Penting" PDFs that had no text (scanned): the owner enters those years by hand. */
  scanned: PdfLink[];
  /** PDFs that could not be downloaded or read. */
  failed: { link: PdfLink; error: string }[];
}

/** The GitHub issue body; "" when nothing needs the owner. */
export function report(r: ReportInput): string {
  const s: string[] = [];
  const fmt = (x: { event_key: EventKey; hijri_year: number; greg_date: string }) => `${LABEL[x.event_key]} ${x.hijri_year}H: **${x.greg_date}**`;
  if (r.plan.insert.length) {
    s.push(`### ${r.inserted ? "Added" : "To add"} as Jangkaan (please check against JAKIM, then press Sahkan in Platform → Takwim)`);
    for (const x of r.plan.insert) s.push(`- ${fmt(x)} — [source](${x.source})`);
  }
  if (r.plan.differs.length) {
    s.push("### JAKIM's list differs from the takwim (not changed: decide in Platform → Takwim)");
    for (const d of r.plan.differs) s.push(`- ${LABEL[d.row.event_key]} ${d.row.hijri_year}H: takwim **${d.row.greg_date}** (${d.row.status}), JAKIM **${d.proposal.greg_date}** — [source](${d.proposal.source})`);
  }
  if (r.plan.implausible.length) {
    s.push("### Read from JAKIM but failed the calendar cross-check (not added: enter by hand if correct)");
    for (const x of r.plan.implausible) s.push(`- ${fmt(x)} — [source](${x.source})`);
  }
  // A scanned list matters only for a year the takwim has nothing for yet.
  const scannedNeeded = r.scanned.filter((l) => !r.rows.some((x) => x.greg_date.startsWith(String(l.year))));
  if (scannedNeeded.length) {
    s.push("### Scanned PDFs (no text to read): enter these years by hand");
    for (const l of scannedNeeded) s.push(`- ${l.year}: [${decodeURIComponent(l.url.split("/").pop() ?? "")}](${l.url})`);
  }
  if (r.failed.length) {
    s.push("### Could not read");
    for (const f of r.failed) s.push(`- ${f.link.year} ${f.link.kind}: ${f.error}`);
  }

  // Gaps in the next 365 days (Nisfu Syaaban is never on JAKIM's list: read it from the day grid).
  const inYear = r.rows.filter((x) => daysBetween(r.today, x.greg_date) >= 0 && daysBetween(r.today, x.greg_date) < 365);
  const pending = r.plan.insert.filter((x) => daysBetween(r.today, x.greg_date) < 365);
  const covered = new Set([...inYear, ...(r.inserted ? pending : [])].map((x) => x.event_key));
  const missing = EVENT_KEYS.filter((k) => !covered.has(k));
  if (missing.length) {
    s.push("### Not dated in the next 365 days");
    for (const k of missing) s.push(`- ${LABEL[k]}${k === "nisfu_syaaban" ? " (15 Syaaban: read it from JAKIM's *Takwim Hijri Miladi* day grid)" : ""}`);
  }

  // Confirm after the official announcement.
  const soon = r.rows.filter((x) => x.status === "jangkaan" && daysBetween(r.today, x.greg_date) >= 0 && daysBetween(r.today, x.greg_date) <= 45).sort((a, b) => a.greg_date.localeCompare(b.greg_date));
  if (soon.length) {
    s.push("### Coming up and still Jangkaan: after the announcement, check the date and press Sahkan");
    for (const x of soon) s.push(`- ${fmt(x)} (in ${daysBetween(r.today, x.greg_date)} days)`);
  }
  if (!s.length) return "";
  return [
    "Weekly check of the Hari Kebesaran takwim (`.github/workflows/takwim.yml`). JAKIM source: https://www.e-solat.gov.my/index.php?siteId=24&pageId=52",
    "",
    ...s,
    "",
    "_This issue is updated by the workflow; close it when everything above is done._",
  ].join("\n");
}
