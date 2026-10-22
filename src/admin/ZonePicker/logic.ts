// Zone picker rules (PRD Phase 2 §4.2 "Choosing the JAKIM zone"). Pure: no React, no network.
// Areas come from the zone descriptions in src/data/zones.json ("Gombak, Petaling, …").
import { ZONES, findZone, type Zone } from "@/data/zones";

/** How the zone was chosen; shown on the confirmation card ("current" = already saved, Tetapan). */
export type ZoneSource = "gps" | "area" | "picked" | "current";

/** What registration (and Tetapan) stores. Coordinates are never part of it. */
export interface ZoneChoice {
  zone: string;
  state: string;
  district: string;
  source: ZoneSource;
}

export interface AreaOption {
  /** Name shown in the Daerah / kawasan list. */
  name: string;
  /** Zones that cover (part of) this area, in code order. More than one → the user must pick. */
  zones: string[];
}

/** Halves of a split area: "Bahagian Sandakan (Timur)" and "(Barat)" are both "Bahagian Sandakan". */
const PART_QUALIFIER = /\s*\((timur|barat|utara|selatan|atas|bawah)\)$/i;

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
function tidy(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > 3 && t === t.toUpperCase() && /[A-Z]/.test(t) ? titleCase(t) : t;
}

/** Split on commas and " dan " outside brackets. */
function splitTop(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && ch === ",") {
      out.push(cur);
      cur = "";
    } else if (depth === 0 && text.slice(i, i + 5).toLowerCase() === " dan ") {
      out.push(cur);
      cur = "";
      i += 4;
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** The areas of one zone description, as written (qualifiers kept): "Gombak", "Bahagian Tawau (Timur)". */
export function zoneAreas(daerah: string): string[] {
  const parts: string[] = [];
  for (const raw of splitTop(daerah)) {
    const p = raw.trim();
    if (!p) continue;
    // A part that is only a bracketed list, e.g. "(Mukim Rompin, Mukim Endau)", is several areas.
    if (p.startsWith("(") && p.endsWith(")")) parts.push(...splitTop(p.slice(1, -1)));
    else parts.push(p);
  }
  return parts.map(tidy).filter(Boolean);
}

/** The name an area is listed under: qualifiers like "(Timur)" removed. */
export function areaName(area: string): string {
  return area.replace(PART_QUALIFIER, "").trim();
}

/** Area list of a zone code, joined for display. */
export function zoneAreaText(code: string, zones: readonly Zone[] = ZONES): string {
  const z = zones.find((x) => x.jakimCode === code.toUpperCase());
  return z ? zoneAreas(z.daerah).join(", ") : "";
}

export function states(zones: readonly Zone[] = ZONES): string[] {
  return [...new Set(zones.map((z) => z.negeri))].sort((a, b) => a.localeCompare(b, "ms"));
}

/** Daerah / kawasan options of one state, sorted, each with the zones that cover it. */
export function areasOfState(state: string, zones: readonly Zone[] = ZONES): AreaOption[] {
  const byKey = new Map<string, AreaOption>();
  for (const z of zones) {
    if (z.negeri !== state) continue;
    for (const a of zoneAreas(z.daerah)) {
      const name = areaName(a);
      const key = name.toLowerCase();
      const opt = byKey.get(key) ?? { name, zones: [] };
      if (!opt.zones.includes(z.jakimCode)) opt.zones.push(z.jakimCode);
      byKey.set(key, opt);
    }
  }
  return [...byKey.values()]
    .map((o) => ({ ...o, zones: [...o.zones].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name, "ms"));
}

/** The choice for a picked area: set automatically when one zone covers it, otherwise null (user picks). */
export function choiceFromArea(state: string, area: AreaOption, pickedZone?: string): ZoneChoice | null {
  if (area.zones.length === 1) return { zone: area.zones[0], state, district: area.name, source: "area" };
  if (pickedZone && area.zones.includes(pickedZone)) return { zone: pickedZone, state, district: area.name, source: "picked" };
  return null;
}

/** "Tukar zon": any zone from the full list. The district is the zone's area list. */
export function choiceFromZone(code: string, zones: readonly Zone[] = ZONES): ZoneChoice | null {
  const z = zones.find((x) => x.jakimCode === code.toUpperCase());
  return z ? { zone: z.jakimCode, state: z.negeri, district: zoneAreaText(z.jakimCode, zones), source: "picked" } : null;
}

/**
 * GET https://api.waktusolat.app/zones/{lat}/{long} → {"zone":"WLY01","state":"KUL","district":"W.P. Kuala Lumpur"}.
 * Returns null unless the zone is a known JAKIM zone. State comes from our list (the API sends a code).
 */
export function parseGpsZone(raw: unknown, zones: readonly Zone[] = ZONES): ZoneChoice | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { zone?: unknown; district?: unknown };
  if (typeof r.zone !== "string" || !/^[A-Za-z]{3}\d{2}$/.test(r.zone.trim())) return null;
  const z = zones.find((x) => x.jakimCode === (r.zone as string).trim().toUpperCase());
  if (!z) return null;
  const district = typeof r.district === "string" && r.district.trim() ? r.district.replace(/\s+/g, " ").trim().slice(0, 100) : zoneAreas(z.daerah)[0];
  return { zone: z.jakimCode, state: z.negeri, district, source: "gps" };
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Searchable list of all zones: matches code, state or any area. Empty query → all. */
export function searchZones(query: string, zones: readonly Zone[] = ZONES): Zone[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...zones];
  return zones.filter((z) => {
    const hay = fold(`${z.jakimCode} ${z.negeri} ${z.daerah}`);
    return words.every((w) => hay.includes(w));
  });
}

export { findZone };
