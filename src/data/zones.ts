// JAKIM zones, a bundled copy of GET https://api.waktusolat.app/zones (fetched 2026-10-18).
import zones from "./zones.json";

export interface Zone {
  jakimCode: string;
  negeri: string;
  daerah: string;
}

export const ZONES: readonly Zone[] = zones;

export function findZone(code: string): Zone | undefined {
  const c = code.trim().toUpperCase();
  return ZONES.find((z) => z.jakimCode === c);
}
