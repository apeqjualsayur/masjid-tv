import { describe, expect, it } from "vitest";
import { addDays, findPdfLinks, parsePenting, plan, plausible, report, type DbRow, type Proposal } from "./takwim-sync-lib";

const PAGE = "https://www.e-solat.gov.my/index.php?siteId=24&pageId=52";

describe("JAKIM download page", () => {
  it("finds the Tarikh Penting lists and day grids by year, absolute URLs, no duplicates", () => {
    const html = `
      <a href="/portalassets/files/TARIKH-TARIKH%20PENTING%20DALAM%20ISLAM%202028.pdf">2028</a>
      <a href='/portalassets/files/Tarikh%20Penting%20Islam2027.pdf'>2027</a>
      <a href="/portalassets/files/Takwim%20Hijri%20Miladi%202027.pdf">Takwim</a>
      <a href="/portalassets/files/Tarikh%20Penting%20Islam2027.pdf">again</a>
      <a href="/portalassets/files/Jadual%20Waktu%20Solat%202027.pdf">other</a>`;
    expect(findPdfLinks(html, PAGE)).toEqual([
      { url: "https://www.e-solat.gov.my/portalassets/files/TARIKH-TARIKH%20PENTING%20DALAM%20ISLAM%202028.pdf", kind: "penting", year: 2028 },
      { url: "https://www.e-solat.gov.my/portalassets/files/Tarikh%20Penting%20Islam2027.pdf", kind: "penting", year: 2027 },
      { url: "https://www.e-solat.gov.my/portalassets/files/Takwim%20Hijri%20Miladi%202027.pdf", kind: "takwim", year: 2027 },
    ]);
  });
});

// The text of JAKIM's 2028 list as the script reads it.
const LINES_2028 = [
  "TARIKH-TARIKH PENTING DALAM ISLAM",
  "TAHUN 2028 / 1449 – 1450H BAGI MALAYSIA",
  "TARIKH HIJRI TARIKH MILADI HARI PERAYAAN /",
  "* 1 Ramadan 1449 28 Januari 2028 Awal Ramadan / Berpuasa",
  "17 Ramadan 1449 13 Februari 2028 Nuzul al-Quran",
  "* 1 Syawal 1449 27 Februari 2028 Hari Raya Puasa / Aidilfitri",
  "1 Zulhijah 1449 26 April 2028 Awal Zulhijah",
  "* 10 Zulhijah 1449 5 Mei 2028 Hari Raya Korban / Aidiladha",
  "1 Muharam 1450 26 Mei 2028 Awal Muharam / Maal Hijrah",
  "12 Rabiulawal 1450 4 Ogos 2028 Maulidur Rasul",
  "27 Rejab 1450 14 Disember 2028 Israk dan Mikraj",
  "* Tarikh ini akan diisytiharkan oleh Penyimpan Mohor Besar Raja-Raja, Malaysia",
];

describe("reading a Tarikh Penting list", () => {
  const got = parsePenting(LINES_2028, "src");
  it("each row by its Hijri date; * = declared; Hari Arafah from 1 Zulhijah + 8 days", () => {
    expect(got.map((p) => [p.event_key, p.hijri_year, p.greg_date, p.declared])).toEqual([
      ["awal_ramadan", 1449, "2028-01-28", true],
      ["nuzul_quran", 1449, "2028-02-13", false],
      ["aidilfitri", 1449, "2028-02-27", true],
      ["hari_arafah", 1449, "2028-05-04", true],
      ["aidiladha", 1449, "2028-05-05", true],
      ["awal_muharram", 1450, "2028-05-26", false],
      ["maulidur_rasul", 1450, "2028-08-04", false],
      ["israk_mikraj", 1450, "2028-12-14", false],
    ]);
  });
  it("ignores other rows and impossible dates", () => {
    expect(parsePenting(["30 Rejab 1450 31 Februari 2028 Something", "Hello 2028"], "src")).toEqual([]);
  });
  it("an explicit 9 Zulhijah row wins over the derived one", () => {
    const r = parsePenting(["9 Zulhijah 1449 4 Mei 2028 Hari Arafah", "1 Zulhijah 1449 26 April 2028 Awal Zulhijah"], "src");
    expect(r.filter((p) => p.event_key === "hari_arafah")).toHaveLength(1);
  });
});

describe("cross-check and plan", () => {
  it("JAKIM's real dates pass the Umm al-Qura cross-check; a wrong month does not", () => {
    for (const p of parsePenting(LINES_2028, "src")) expect(plausible(p), p.event_key).toBe(true);
    expect(plausible({ event_key: "awal_ramadan", hijri_year: 1449, greg_date: "2028-03-28" })).toBe(false);
    expect(plausible({ event_key: "awal_ramadan", hijri_year: 1450, greg_date: "2028-01-28" })).toBe(false);
  });
  const P = (event_key: Proposal["event_key"], hijri_year: number, greg_date: string): Proposal => ({ event_key, hijri_year, greg_date, declared: false, source: "src" });
  const rows: DbRow[] = [{ event_key: "awal_ramadan", hijri_year: 1449, greg_date: "2028-01-28", status: "jangkaan" }, { event_key: "aidilfitri", hijri_year: 1449, greg_date: "2028-02-26", status: "rasmi" }];
  it("adds only missing future rows; never changes an existing one; past rows are skipped", () => {
    const p = plan([P("awal_ramadan", 1449, "2028-01-28"), P("aidilfitri", 1449, "2028-02-27"), P("israk_mikraj", 1450, "2028-12-14"), P("awal_muharram", 1448, "2026-06-17"), P("nuzul_quran", 1449, "2028-05-13")], rows, "2026-11-20");
    expect(p.insert.map((x) => x.event_key)).toEqual(["israk_mikraj"]);
    expect(p.differs).toEqual([{ proposal: P("aidilfitri", 1449, "2028-02-27"), row: rows[1] }]);
    expect(p.implausible.map((x) => x.event_key)).toEqual(["nuzul_quran"]);
  });
});

describe("the owner's report", () => {
  const today = "2026-11-20";
  const full: DbRow[] = (["israk_mikraj", "nisfu_syaaban", "awal_ramadan", "nuzul_quran", "aidilfitri", "hari_arafah", "aidiladha", "awal_muharram", "maulidur_rasul"] as const).map((k, i) => ({ event_key: k, hijri_year: 1448, greg_date: addDays("2027-01-06", i * 25), status: "rasmi" }));
  const empty = { insert: [], differs: [], implausible: [] };
  it("nothing to do → empty (no issue)", () => {
    expect(report({ today, rows: full, plan: empty, inserted: false, scanned: [], failed: [] })).toBe("");
  });
  it("lists missing events (Nisfu Syaaban with where to read it) and confirmations coming up", () => {
    const rows: DbRow[] = [...full.filter((r) => r.event_key !== "nisfu_syaaban"), { event_key: "awal_ramadan", hijri_year: 1448, greg_date: addDays(today, 30), status: "jangkaan" }];
    const out = report({ today, rows, plan: empty, inserted: false, scanned: [], failed: [] });
    expect(out).toContain("Nisfu Syaaban (15 Syaaban");
    expect(out).toContain("Awal Ramadan 1448H");
    expect(out).toContain("in 30 days");
  });
  it("a scanned list is mentioned only for a year with no rows yet", () => {
    const link = (year: number) => ({ url: `https://x/Tarikh%20Penting%20${year}.pdf`, kind: "penting" as const, year });
    const out = report({ today, rows: full, plan: empty, inserted: false, scanned: [link(2027), link(2029)], failed: [] });
    expect(out).toContain("2029:");
    expect(out).not.toContain("2027:");
  });
  it("says what was added and asks to Sahkan", () => {
    const p = { ...empty, insert: [{ event_key: "israk_mikraj" as const, hijri_year: 1450, greg_date: "2028-12-14", declared: false, source: "https://x" }] };
    expect(report({ today, rows: full, plan: p, inserted: true, scanned: [], failed: [] })).toMatch(/Added as Jangkaan[\s\S]*Israk dan Mikraj 1450H: \*\*2028-12-14\*\*/);
  });
});
