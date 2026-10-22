// "Guna lokasi saya": browser location → Waktu Solat API zone lookup. The coordinates are only
// sent to the lookup (rounded to ~11 m) and are never stored (PRD Phase 2 §4.2, PDPA).
import { API_BASE } from "@/data/api";
import type { FetchLike } from "@/data/types";
import { parseGpsZone, type ZoneChoice } from "./logic";

export type GpsFailure = "unsupported" | "denied" | "timeout" | "unavailable" | "offline" | "api";
export type GpsResult = { ok: true; choice: ZoneChoice } | { ok: false; reason: GpsFailure };

export const GPS_TIMEOUT_MS = 10_000;

export function gpsZoneUrl(lat: number, lon: number): string {
  return `${API_BASE}/zones/${lat.toFixed(4)}/${lon.toFixed(4)}`;
}

export interface GpsDeps {
  geolocation?: Pick<Geolocation, "getCurrentPosition">;
  fetch: FetchLike;
  /** navigator.onLine */
  online: () => boolean;
}

function position(geo: Pick<Geolocation, "getCurrentPosition">): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    geo.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject(e),
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 60_000 },
    );
  });
}

/** GeolocationPositionError codes: 1 denied, 2 unavailable, 3 timeout. */
export function failureOfGeoError(e: unknown): GpsFailure {
  const code = (e as { code?: number })?.code;
  return code === 1 ? "denied" : code === 3 ? "timeout" : "unavailable";
}

export async function locateZone(deps: GpsDeps): Promise<GpsResult> {
  if (!deps.geolocation) return { ok: false, reason: "unsupported" };
  if (!deps.online()) return { ok: false, reason: "offline" };
  let coords: { lat: number; lon: number };
  try {
    coords = await position(deps.geolocation);
  } catch (e) {
    return { ok: false, reason: failureOfGeoError(e) };
  }
  try {
    const res = await deps.fetch(gpsZoneUrl(coords.lat, coords.lon), { cache: "no-store" });
    if (!res.ok) return { ok: false, reason: "api" };
    const choice = parseGpsZone(await res.json());
    return choice ? { ok: true, choice } : { ok: false, reason: "api" };
  } catch {
    return { ok: false, reason: deps.online() ? "api" : "offline" };
  }
}

export function browserGpsDeps(): GpsDeps {
  return {
    geolocation: typeof navigator !== "undefined" && "geolocation" in navigator ? navigator.geolocation : undefined,
    fetch: (url, init) => fetch(url, init),
    online: () => (typeof navigator === "undefined" ? true : navigator.onLine !== false),
  };
}
