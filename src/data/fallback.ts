// Bundled 12-month fallback: public/data/{zone}-{year}.json, built by scripts/fetch-year.ts.
import type { FetchLike, MonthData, YearFile } from "./types";

export type YearLoader = (zone: string, year: number) => Promise<YearFile | null>;

export function fallbackUrl(zone: string, year: number, baseUrl = "/data"): string {
  return `${baseUrl}/${zone.toUpperCase()}-${year}.json`;
}

/** Loads (and remembers) bundled year files. Missing or broken files resolve to null. */
export function createFallbackLoader(fetchImpl: FetchLike = fetch, baseUrl = "/data"): YearLoader {
  const loaded = new Map<string, YearFile>();
  return async (zone, year) => {
    const url = fallbackUrl(zone, year, baseUrl);
    const hit = loaded.get(url);
    if (hit) return hit;
    try {
      const res = await fetchImpl(url);
      if (!res.ok) return null;
      const file = (await res.json()) as YearFile;
      if (!file || !Array.isArray(file.months)) return null;
      loaded.set(url, file);
      return file;
    } catch {
      return null;
    }
  };
}

export function monthFromYearFile(file: YearFile | null, month: number): MonthData | undefined {
  return file?.months.find((m) => m && m.month === month);
}
