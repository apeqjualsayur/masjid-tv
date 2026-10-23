import { describe, expect, it } from "vitest";
import { afterStart, afterStartError, afterStatus, countdown, isSecret, newSecret, pairUrl, qrModules } from "./logic";

describe("device secret", () => {
  it("is 64 hex characters from 32 random bytes", () => {
    const s = newSecret((a) => a.fill(0xab));
    expect(s).toBe("ab".repeat(32));
    expect(isSecret(s)).toBe(true);
    expect(isSecret(newSecret())).toBe(true);
    expect(newSecret()).not.toBe(newSecret());
    expect(isSecret("abc")).toBe(false);
    expect(isSecret(null)).toBe(false);
  });
});

describe("QR and countdown", () => {
  it("QR URL opens the admin Skrin page with the code", () => {
    expect(pairUrl("https://masjidview.my", "482913")).toBe("https://masjidview.my/admin/skrin/?pair=482913");
    expect(pairUrl("http://localhost:3100/", "000123")).toBe("http://localhost:3100/admin/skrin/?pair=000123");
  });
  it("QR grid is square with finder patterns in three corners", () => {
    const m = qrModules(pairUrl("https://masjidview.my", "482913"));
    const n = m.length;
    expect(n).toBeGreaterThanOrEqual(25);
    expect(m.every((row) => row.length === n)).toBe(true);
    for (const [r, c] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
      expect(m[r][c]).toBe(true);
      expect(m[r + 6][c + 6]).toBe(true);
      expect(m[r + 1][c + 1]).toBe(false);
      expect(m[r + 3][c + 3]).toBe(true);
    }
  });
  it("countdown m:ss, never negative", () => {
    expect(countdown(600_000, 0)).toBe("10:00");
    expect(countdown(582_000, 0)).toBe("9:42");
    expect(countdown(1_500, 0)).toBe("0:02");
    expect(countdown(0, 5_000)).toBe("0:00");
  });
});

describe("pairing steps", () => {
  const waiting = { kind: "waiting" as const, code: "482913", expiresAt: 1 };
  it("pair_start: code to show, or already paired", () => {
    expect(afterStart({ status: "waiting", code: "482913", expires_at: "2026-10-22T10:10:00Z" })).toEqual({
      view: { kind: "waiting", code: "482913", expiresAt: Date.parse("2026-10-22T10:10:00Z") }, next: "poll",
    });
    expect(afterStart({ status: "already_paired" })).toEqual({ view: { kind: "paired", screenId: null }, next: "none" });
    expect(afterStart({ status: "waiting", code: "12" })).toMatchObject({ next: "start" });
    expect(afterStart(null)).toMatchObject({ view: { kind: "error" }, next: "start" });
  });
  it("pair_status: paired, expired and unknown", () => {
    expect(afterStatus({ status: "paired", screen_id: "s1" }, waiting)).toEqual({ view: { kind: "paired", screenId: "s1" }, next: "none" });
    expect(afterStatus({ status: "expired" }, waiting)).toEqual({ view: waiting, next: "start" });
    expect(afterStatus({ status: "unknown" }, waiting)).toEqual({ view: waiting, next: "start" });
    expect(afterStatus({ status: "waiting", code: "482913" }, waiting)).toEqual({ view: waiting, next: "poll" });
  });
  it("an old claimed code for this secret means: new secret", () => {
    expect(afterStatus({ status: "waiting", code: "111111" }, waiting)).toEqual({ view: waiting, next: "rotate" });
    expect(afterStartError("busy", true, false)).toMatchObject({ next: "rotate" });
    expect(afterStartError("busy", true, true)).toMatchObject({ view: { kind: "error" }, next: "start" });
  });
  it("offline and other errors retry", () => {
    expect(afterStartError("Failed to fetch", false, false)).toEqual({ view: { kind: "offline" }, next: "start" });
    expect(afterStartError("bad_secret", true, false)).toEqual({ view: { kind: "error" }, next: "start" });
  });
});