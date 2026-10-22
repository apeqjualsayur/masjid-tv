import { describe, expect, it } from "vitest";
import { isEligible, localToEpoch, localParts } from "@/core";
import {
  bundleSlides, dbDaysToPlaylist, isoForPlaylist, mediaUrl, parseBundleAnswer, referencedMedia, startBundleSync,
  type Bundle, type BundleState, type BundleStore, type StoredBundle,
} from "./bundle";

const SB = "https://abc.supabase.co";
const ORG = "11111111-2222-3333-4444-555555555555";

/** Shaped like a real screen_bundle answer (jsonb timestamps with microseconds). */
function answer(over: Record<string, unknown> = {}) {
  return {
    status: "ok",
    version: 7,
    screen: { id: "scr-1", name: "Dewan Solat Utama", theme: "serambi", layout: "bottom" },
    org: { fullName: "Masjid Al-Hidayah", shortName: "Al-Hidayah", kind: "masjid", zone: "SGR03", accentColor: "#1F4E8A", logoPath: `${ORG}/logo.webp` },
    settings: {
      iqamahMin: { subuh: 9, zohor: 10, asar: 10, maghrib: 7, isyak: 10 },
      durations: { preAzanMin: 5, azanMin: 3, solatMin: 12, khutbahMin: 45 },
      clock24h: true,
      showArabic: false,
      ticker: ["Kuliah Maghrib malam ini"],
    },
    slides: [
      {
        id: "s-kuliah", type: "template", templateKey: "kuliah",
        fields: { series: "Kuliah Maghrib", topic: "Adab", speaker: "Ustaz Ahmad" },
        startsAt: "2026-10-20T00:00:00.123456+00:00", endsAt: "2026-10-27T15:59:59.999999+00:00",
        durationS: 20, daysOfWeek: [1, 3, 7], priority: true, sortOrder: 2, media: null,
      },
      {
        id: "s-poster", type: "poster", templateKey: null, fields: {},
        startsAt: "2026-10-22T02:00:00+00:00", endsAt: null, durationS: 15, daysOfWeek: null, priority: false, sortOrder: 1,
        media: { path: `${ORG}/poster one.webp`, width: 1080, height: 1350 },
      },
      { id: "s-bad", type: "template", templateKey: "kuliah", fields: { topic: "tiada penceramah" }, startsAt: "2026-10-20T00:00:00+00:00", endsAt: null, durationS: 15, daysOfWeek: null, priority: false, sortOrder: 3, media: null },
    ],
    ...over,
  };
}
const okBundle = (over: Record<string, unknown> = {}) => {
  const a = parseBundleAnswer(answer(over));
  if (a.kind !== "ok") throw new Error("fixture invalid");
  return a.bundle;
};

describe("parseBundleAnswer", () => {
  it("reads ok / unchanged / revoked / suspended", () => {
    expect(parseBundleAnswer(answer())).toMatchObject({ kind: "ok", bundle: { version: 7, screen: { name: "Dewan Solat Utama" } } });
    expect(parseBundleAnswer({ status: "unchanged", version: 7 })).toEqual({ kind: "unchanged", version: 7 });
    expect(parseBundleAnswer({ status: "revoked" })).toEqual({ kind: "revoked" });
    expect(parseBundleAnswer({ status: "suspended" })).toEqual({ kind: "suspended" });
  });
  it("rejects broken shapes instead of applying them", () => {
    expect(parseBundleAnswer(null).kind).toBe("invalid");
    expect(parseBundleAnswer({ status: "weird" }).kind).toBe("invalid");
    expect(parseBundleAnswer(answer({ version: "7" })).kind).toBe("invalid");
    expect(parseBundleAnswer(answer({ screen: { id: "x" } })).kind).toBe("invalid");
    expect(parseBundleAnswer(answer({ org: { fullName: "A" } })).kind).toBe("invalid");
    expect(parseBundleAnswer(answer({ slides: "none" })).kind).toBe("invalid");
    expect(parseBundleAnswer({ status: "unchanged" }).kind).toBe("invalid");
  });
});

describe("mapping helpers", () => {
  it("media URL in the public bucket, path segments encoded", () => {
    expect(mediaUrl(SB + "/", `${ORG}/poster one.webp`)).toBe(`${SB}/storage/v1/object/public/media/${ORG}/poster%20one.webp`);
  });
  it("database weekdays 1..7 → playlist 0..6", () => {
    expect(dbDaysToPlaylist([1, 3, 7])).toEqual([1, 3, 0]);
    expect(dbDaysToPlaylist(null)).toBeUndefined();
    expect(dbDaysToPlaylist([])).toBeUndefined();
  });
  it("Postgres timestamps become ISO the playlist parses (ms precision)", () => {
    expect(isoForPlaylist("2026-10-20T00:00:00.123456+00:00")).toBe("2026-10-20T00:00:00.123+00:00");
    expect(isoForPlaylist("2026-10-20 08:00:00+08")).toBe("2026-10-20T08:00:00+08");
    expect(isoForPlaylist(null)).toBeUndefined();
  });
  it("referenced media: logo + posters, no duplicates", () => {
    expect(referencedMedia(okBundle(), SB)).toEqual([`${SB}/storage/v1/object/public/media/${ORG}/logo.webp`, `${SB}/storage/v1/object/public/media/${ORG}/poster%20one.webp`]);
    expect(referencedMedia(okBundle({ org: { ...answer().org, logoPath: null }, slides: [] }), SB)).toEqual([]);
  });
});

describe("bundleSlides", () => {
  it("maps template and poster slides; invalid slides are dropped with a warning", () => {
    const { items, warnings } = bundleSlides(okBundle(), SB);
    expect(items.map((i) => i.id)).toEqual(["s-kuliah", "s-poster"]);
    expect(warnings).toEqual([expect.stringContaining("s-bad")]);
    const k = items[0];
    expect(k).toMatchObject({ durationS: 20, priority: true, sortOrder: 2, daysOfWeek: [1, 3, 0], status: "active" });
    expect(k.payload).toEqual({ kind: "template", template: "kuliah", fields: { series: "Kuliah Maghrib", topic: "Adab", speaker: "Ustaz Ahmad" } });
    expect(items[1].payload).toEqual({ kind: "poster", imageUrl: `${SB}/storage/v1/object/public/media/${ORG}/poster%20one.webp` });
  });

  it("schedule rules: start, end (exclusive) and weekdays, in Malaysia time", () => {
    const { items } = bundleSlides(okBundle(), SB);
    const kuliah = items.find((i) => i.id === "s-kuliah")!;
    const poster = items.find((i) => i.id === "s-poster")!;
    // 2026-10-20 08:00 MYT = starts_at 00:00 UTC; it is a Tuesday (Selasa): not in Isnin/Rabu/Ahad.
    const tue = localToEpoch(2026, 10, 20, 9, 0);
    expect(localParts(tue).weekday).toBe(2);
    expect(isEligible(kuliah, tue)).toBe(false);
    // Wednesday 21 Oct: allowed weekday, after start.
    expect(isEligible(kuliah, localToEpoch(2026, 10, 21, 9, 0))).toBe(true);
    // Monday 19 Oct is before starts_at.
    expect(isEligible(kuliah, localToEpoch(2026, 10, 19, 9, 0))).toBe(false);
    // Ends 2026-10-27T15:59:59.999Z = 23:59:59.999 MYT on Tue 27th; Sunday 25th still shown, Wed 28th not.
    expect(isEligible(kuliah, localToEpoch(2026, 10, 25, 20, 0))).toBe(true);
    expect(isEligible(kuliah, localToEpoch(2026, 10, 28, 9, 0))).toBe(false);
    // Poster: from 22 Oct 10:00 MYT, every day, no end.
    expect(isEligible(poster, localToEpoch(2026, 10, 22, 9, 59))).toBe(false);
    expect(isEligible(poster, localToEpoch(2026, 10, 22, 10, 0))).toBe(true);
    expect(isEligible(poster, localToEpoch(2027, 3, 1, 10, 0))).toBe(true);
  });
});

// ------------------------------------------------------------------ sync loop

function memStore(initial: StoredBundle | null = null) {
  let v = initial;
  const store: BundleStore = { get: async () => v, put: async (x) => void (v = x), clear: async () => void (v = null) };
  return { store, value: () => v };
}

function loop(calls: ((since: number) => { data?: unknown; error?: { message: string } })[], initial: StoredBundle | null = null) {
  const states: BundleState[] = [];
  const sinces: number[] = [];
  const timers: (() => void)[] = [];
  const mem = memStore(initial);
  let i = 0;
  const sync = startBundleSync({
    call: async (since) => {
      sinces.push(since);
      const f = calls[Math.min(i++, calls.length - 1)];
      const r = f(since);
      return { data: r.data ?? null, error: r.error ?? null };
    },
    store: mem.store,
    onState: (s) => states.push(s),
    now: () => 1000,
    setTimer: (fn) => (timers.push(fn), timers.length),
    clearTimer: () => {},
  });
  const next = async () => {
    const fn = timers.shift();
    fn?.();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  };
  return { sync, states, sinces, next, mem, last: () => states.at(-1)! };
}

describe("startBundleSync", () => {
  it("first sync: ok → stored and applied; then unchanged with the version", async () => {
    const l = loop([() => ({ data: answer() }), () => ({ data: { status: "unchanged", version: 7 } })]);
    await l.sync.ready;
    expect(l.last()).toMatchObject({ status: "ok", from: "live", suspended: false, lastSync: 1000 });
    expect(l.mem.value()?.bundle.version).toBe(7);
    await l.next();
    expect(l.sinces).toEqual([0, 7]);
    expect(l.last()).toMatchObject({ status: "unchanged", from: "live" });
    expect(l.last().bundle?.version).toBe(7);
  });

  it("offline boot: shows the stored bundle at once and keeps it when the network fails", async () => {
    const l = loop([() => ({ error: { message: "Failed to fetch" } })], { bundle: okBundle(), savedAt: 5, suspended: false });
    await l.sync.ready;
    expect(l.states[0]).toMatchObject({ status: "starting", from: "cache" });
    expect(l.states[0].bundle?.screen.name).toBe("Dewan Solat Utama");
    expect(l.last()).toMatchObject({ status: "offline", from: "cache", error: "Failed to fetch" });
    expect(l.last().bundle).not.toBeNull();
    expect(l.sinces).toEqual([7]);
  });

  it("a thrown error is treated like offline", async () => {
    const l = loop([() => { throw new TypeError("network down"); }], { bundle: okBundle(), savedAt: 5, suspended: false });
    await l.sync.ready;
    expect(l.last()).toMatchObject({ status: "offline", error: "network down" });
    expect(l.last().bundle).not.toBeNull();
  });

  it("revoked: wipes the stored bundle and stops polling", async () => {
    const l = loop([() => ({ data: { status: "revoked" } })], { bundle: okBundle(), savedAt: 5, suspended: false });
    await l.sync.ready;
    expect(l.last()).toMatchObject({ status: "revoked", bundle: null });
    expect(l.mem.value()).toBeNull();
    await l.next();
    expect(l.sinces).toHaveLength(1);
  });

  it("suspended: flagged and remembered; a network error does not clear it; reactivation does", async () => {
    const l = loop(
      [
        () => ({ data: { status: "suspended" } }),
        () => ({ error: { message: "offline" } }),
        () => ({ data: answer({ version: 8 }) }),
      ],
      { bundle: okBundle(), savedAt: 5, suspended: false },
    );
    await l.sync.ready;
    expect(l.last()).toMatchObject({ status: "suspended", suspended: true });
    expect(l.mem.value()?.suspended).toBe(true);
    await l.next();
    expect(l.last()).toMatchObject({ status: "offline", suspended: true });
    await l.next();
    expect(l.last()).toMatchObject({ status: "ok", suspended: false });
    expect(l.mem.value()).toMatchObject({ suspended: false, bundle: { version: 8 } });
  });

  it("boot while suspended (from storage) stays suspended offline", async () => {
    const l = loop([() => ({ error: { message: "offline" } })], { bundle: okBundle(), savedAt: 5, suspended: true });
    await l.sync.ready;
    expect(l.states[0]).toMatchObject({ suspended: true, from: "cache" });
    expect(l.last()).toMatchObject({ status: "offline", suspended: true });
  });

  it("an invalid answer keeps the current bundle", async () => {
    const l = loop([() => ({ data: { status: "ok", version: 9 } })], { bundle: okBundle(), savedAt: 5, suspended: false });
    await l.sync.ready;
    expect(l.last()).toMatchObject({ status: "invalid" });
    expect(l.last().bundle?.version).toBe(7);
    expect(l.mem.value()?.bundle.version).toBe(7);
  });
});
describe("template images (QR, speaker photo)", () => {
  const withQr = () =>
    okBundle({
      slides: [
        { id: "s-infaq", type: "template", templateKey: "infaq", fields: { fundName: "Tabung", collected: 10, target: 100, qrImage: `${ORG}/qr.webp` }, startsAt: null, endsAt: null, durationS: 15, daysOfWeek: null, priority: false, sortOrder: 0, media: null },
      ],
    });
  it("bucket paths become public URLs on the TV", () => {
    const { items } = bundleSlides(withQr(), SB);
    expect((items[0].payload as { fields: { qrImage: string } }).fields.qrImage).toBe(`${SB}/storage/v1/object/public/media/${ORG}/qr.webp`);
  });
  it("are kept by the media cache", () => {
    expect(referencedMedia(withQr(), SB)).toContain(`${SB}/storage/v1/object/public/media/${ORG}/qr.webp`);
  });
});
