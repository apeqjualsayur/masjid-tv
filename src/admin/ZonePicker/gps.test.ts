import { describe, expect, it, vi } from "vitest";
import { GPS_TIMEOUT_MS, gpsZoneUrl, locateZone, type GpsDeps } from "./gps";

const KL = { coords: { latitude: 3.139, longitude: 101.6869 } } as GeolocationPosition;

function geoOk(pos = KL) {
  return { getCurrentPosition: vi.fn((ok: PositionCallback, _err?: PositionErrorCallback | null, _opts?: PositionOptions) => ok(pos)) };
}
function geoFail(code: number) {
  return { getCurrentPosition: vi.fn((_ok: PositionCallback, err?: PositionErrorCallback | null) => err?.({ code } as GeolocationPositionError)) };
}
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

function deps(over: Partial<GpsDeps>): GpsDeps {
  return { geolocation: geoOk(), fetch: vi.fn(() => json({ zone: "WLY01", state: "KUL", district: "W.P. Kuala Lumpur" })), online: () => true, ...over };
}

describe("locateZone", () => {
  it("looks up the zone for the device position", async () => {
    const d = deps({});
    expect(await locateZone(d)).toEqual({ ok: true, choice: { zone: "WLY01", state: "Wilayah Persekutuan", district: "W.P. Kuala Lumpur", source: "gps" } });
    expect(d.fetch).toHaveBeenCalledWith("https://api.waktusolat.app/zones/3.1390/101.6869", { cache: "no-store" });
  });

  it("asks for a high-accuracy position with a 10 s timeout", async () => {
    const geo = geoOk();
    await locateZone(deps({ geolocation: geo }));
    expect(geo.getCurrentPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS });
    expect(GPS_TIMEOUT_MS).toBe(10_000);
  });

  it("rounds coordinates in the URL", () => {
    expect(gpsZoneUrl(3.13901234, 101.68694567)).toBe("https://api.waktusolat.app/zones/3.1390/101.6869");
  });

  it("falls back on permission denied, timeout and no position", async () => {
    expect(await locateZone(deps({ geolocation: geoFail(1) }))).toEqual({ ok: false, reason: "denied" });
    expect(await locateZone(deps({ geolocation: geoFail(3) }))).toEqual({ ok: false, reason: "timeout" });
    expect(await locateZone(deps({ geolocation: geoFail(2) }))).toEqual({ ok: false, reason: "unavailable" });
  });

  it("falls back when the browser has no geolocation", async () => {
    expect(await locateZone(deps({ geolocation: undefined }))).toEqual({ ok: false, reason: "unsupported" });
  });

  it("offline: does not ask for location at all", async () => {
    const geo = geoOk();
    expect(await locateZone(deps({ geolocation: geo, online: () => false }))).toEqual({ ok: false, reason: "offline" });
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
  });

  it("API down, error status or unexpected answer gives api", async () => {
    expect(await locateZone(deps({ fetch: () => Promise.reject(new TypeError("Failed to fetch")) }))).toEqual({ ok: false, reason: "api" });
    expect(await locateZone(deps({ fetch: () => json({ message: "Server error" }, 500) }))).toEqual({ ok: false, reason: "api" });
    expect(await locateZone(deps({ fetch: () => json({ zone: "ZZZ01" }) }))).toEqual({ ok: false, reason: "api" });
    expect(await locateZone(deps({ fetch: () => Promise.resolve(new Response("<html>", { status: 200 })) }))).toEqual({ ok: false, reason: "api" });
  });

  it("connection lost during the lookup gives offline", async () => {
    let online = true;
    const d = deps({
      online: () => online,
      fetch: () => {
        online = false;
        return Promise.reject(new TypeError("Failed to fetch"));
      },
    });
    expect(await locateZone(d)).toEqual({ ok: false, reason: "offline" });
  });
});