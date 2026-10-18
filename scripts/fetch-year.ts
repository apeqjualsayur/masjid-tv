// Build the bundled offline fallback (PRD section 9.2 step 2):
//   npm run fetch-year -- SGR01 2026
// Downloads all 12 months for a zone into public/data/{ZONE}-{YEAR}.json.
// Months the API has not published yet are skipped and reported; if none exist, no file is written.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchMonth } from "../src/data/api";
import type { MonthData, YearFile } from "../src/data/types";
import { findZone } from "../src/data/zones";

async function main() {
  const [zoneArg, yearArg] = process.argv.slice(2);
  const zone = (zoneArg ?? "").toUpperCase();
  const year = Number(yearArg);
  if (!findZone(zone) || !Number.isInteger(year) || year < 2000 || year > 2100) {
    console.error("Usage: npm run fetch-year -- <ZONE> <YEAR>   e.g. npm run fetch-year -- SGR01 2026");
    process.exit(2);
  }

  const months: MonthData[] = [];
  const missing: string[] = [];
  for (let month = 1; month <= 12; month++) {
    try {
      months.push(await fetchMonth(zone, year, month));
      process.stdout.write(`  ${year}-${String(month).padStart(2, "0")} ok\n`);
    } catch (e) {
      missing.push(`${year}-${String(month).padStart(2, "0")}`);
      process.stdout.write(`  ${year}-${String(month).padStart(2, "0")} MISSING (${(e as Error).message})\n`);
    }
  }

  if (months.length === 0) {
    console.error(`No data published for ${zone} ${year} yet. Nothing written.`);
    process.exit(1);
  }

  const file: YearFile = { zone, year, fetchedAt: Date.now(), months };
  const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data", `${zone}-${year}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(file) + "\n");
  console.log(`Wrote ${out} (${months.length}/12 months)`);
  if (missing.length) {
    console.warn(`WARNING: missing ${missing.join(", ")}. Re-run once JAKIM publishes them.`);
    process.exit(3);
  }
}

main();
