// Weekly takwim check (PRD enhancements §5.2, E12; run by .github/workflows/takwim.yml):
//   npx tsx scripts/takwim-sync.ts [--write] [--report=takwim-report.md]
// 1. Reads JAKIM's download page on e-Solat and every "Tarikh Penting dalam Islam" PDF for this year
//    and later. 2. Proposes the missing future dates (cross-checked against the Umm al-Qura calendar).
// 3. With --write, adds them to public.islamic_events as Jangkaan (one insert = one TV refresh), never
//    changing a row that is already there. 4. Writes the report for the owner's GitHub issue.
// Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { findPdfLinks, parsePenting, plan, report, type DbRow, type PdfLink, type Proposal } from "./takwim-sync-lib";

const PAGE = "https://www.e-solat.gov.my/index.php?siteId=24&pageId=52";
const NOTE = "Dicadangkan automatik daripada senarai JAKIM: semak, kemudian tekan Sahkan";

const write = process.argv.includes("--write");
const reportPath = process.argv.find((a) => a.startsWith("--report="))?.slice("--report=".length);
const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10); // Malaysia date

async function fetchOk(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { "user-agent": "masjidview-takwim-check" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

/** Text lines of a PDF (items on the same baseline joined, top to bottom). */
async function pdfLines(data: Uint8Array): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: true, verbosity: 0 }).promise;
  const lines: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    const rows = new Map<number, { x: number; w: number; s: string }[]>();
    for (const it of content.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3) * 3; // same row within 3 pt
      rows.set(y, [...(rows.get(y) ?? []), { x: it.transform[4], w: it.width, s: it.str }]);
    }
    // Some PDFs split words and numbers into pieces ("14" "4" "9" = 1449): pieces that touch on the
    // page are joined without a space.
    for (const [, items] of [...rows].sort((a, b) => b[0] - a[0])) {
      let line = "";
      let end = -Infinity;
      for (const t of items.sort((a, b) => a.x - b.x)) {
        line += (line && t.x - end > 1.5 ? " " : "") + t.s;
        end = t.x + t.w;
      }
      lines.push(line);
    }
  }
  await doc.destroy();
  return lines;
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const year = Number(today.slice(0, 4));
  const links = findPdfLinks(await (await fetchOk(PAGE)).text(), PAGE).filter((l) => l.kind === "penting" && l.year >= year);
  console.log(`JAKIM lists for ${year}+: ${links.map((l) => l.year).join(", ") || "none"}`);

  const proposals: Proposal[] = [];
  const scanned: PdfLink[] = [];
  const failed: { link: PdfLink; error: string }[] = [];
  for (const link of links) {
    try {
      const lines = await pdfLines(new Uint8Array(await (await fetchOk(link.url)).arrayBuffer()));
      const found = parsePenting(lines, link.url);
      console.log(`  ${link.year}: ${lines.length} text lines, ${found.length} dates`);
      if (!found.length) scanned.push(link);
      proposals.push(...found);
    } catch (e) {
      failed.push({ link, error: (e as Error).message });
    }
  }

  const { data, error } = await sb.from("islamic_events").select("event_key, hijri_year, greg_date, status");
  if (error) throw new Error(`islamic_events: ${error.message}`);
  const rows = (data ?? []) as DbRow[];
  const p = plan(proposals, rows, today);
  console.log(`takwim rows: ${rows.length}; to add: ${p.insert.length}; differs: ${p.differs.length}; failed cross-check: ${p.implausible.length}`);

  let inserted = false;
  if (write && p.insert.length) {
    const { error: e } = await sb.from("islamic_events").insert(p.insert.map((x) => ({ event_key: x.event_key, hijri_year: x.hijri_year, greg_date: x.greg_date, status: "jangkaan", note: NOTE })));
    if (e) throw new Error(`insert: ${e.message}`);
    inserted = true;
    console.log(`added ${p.insert.length} rows as Jangkaan`);
  }

  const body = report({ today, rows, plan: p, inserted, scanned, failed });
  if (reportPath) writeFileSync(reportPath, body);
  console.log(body ? `\n${body}` : "\nNothing needs the owner.");
}

main().catch((e) => {
  console.error(`::error::${(e as Error).message}`);
  process.exit(1);
});
