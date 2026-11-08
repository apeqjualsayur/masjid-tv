import { describe, expect, it } from "vitest";
import { SOUND_CHOICES, claimErrorKey, codeFromPaste, codeFromQuery, layoutChoices, nameError, onlyDigits, screenStatus, screenUpdate, sortScreens, soundError, soundOf, soundSectionVisible, suggestPosterLayout, themeChoices, type Screen } from "./logic";

describe("pairing code input", () => {
  it("keeps digits only, at most 6", () => {
    expect(onlyDigits("48a2 9-13x7")).toBe("482913");
    expect(onlyDigits("12", 1)).toBe("1");
  });
  it("paste: finds the 6-digit code in any text", () => {
    expect(codeFromPaste("482913")).toBe("482913");
    expect(codeFromPaste("Kod: 482 913")).toBe("482913");
    expect(codeFromPaste("482-913")).toBe("482913");
    expect(codeFromPaste("ab12")).toBe("12");
  });
  it("?pair= from the QR link", () => {
    expect(codeFromQuery("?pair=482913")).toBe("482913");
    expect(codeFromQuery("?pair=48291")).toBeNull();
    expect(codeFromQuery("?pair=abcdef")).toBeNull();
    expect(codeFromQuery("")).toBeNull();
  });
});

describe("screen name", () => {
  it("1 to 60 characters", () => {
    expect(nameError("  ")).toBe("screens.err.nameRequired");
    expect(nameError("Dewan Solat Utama")).toBeNull();
    expect(nameError("x".repeat(60))).toBeNull();
    expect(nameError("x".repeat(61))).toBe("screens.err.nameLength");
  });
});

describe("pair_claim results", () => {
  it("screen id = success; NULL = wrong or expired code", () => {
    expect(claimErrorKey("3f1c-uuid", null)).toBeNull();
    expect(claimErrorKey(null, null)).toBe("screens.err.invalidCode");
  });
  it("friendly errors", () => {
    expect(claimErrorKey(null, { message: "too_many_attempts", code: "P0001" })).toBe("screens.err.tooManyAttempts");
    expect(claimErrorKey(null, { message: "invalid_code" })).toBe("screens.err.invalidCode");
    expect(claimErrorKey(null, { message: "not_allowed", code: "42501" })).toBe("screens.err.notAllowed");
    expect(claimErrorKey(null, { message: "TypeError: Failed to fetch" })).toBe("screens.err.network");
    expect(claimErrorKey(null, { message: "weird" })).toBe("screens.err.generic");
  });
});

describe("screen status", () => {
  const now = Date.parse("2026-10-22T10:00:00Z");
  it("online within 3 minutes, else offline for how long, never seen, revoked", () => {
    expect(screenStatus({ last_seen_at: "2026-10-22T09:58:30Z", revoked_at: null }, now)).toEqual({ kind: "online" });
    expect(screenStatus({ last_seen_at: "2026-10-22T07:00:00Z", revoked_at: null }, now)).toEqual({ kind: "offline", forMs: 3 * 3600_000 });
    expect(screenStatus({ last_seen_at: null, revoked_at: null }, now)).toEqual({ kind: "never" });
    expect(screenStatus({ last_seen_at: "2026-10-22T09:59:00Z", revoked_at: "2026-10-22T09:59:30Z" }, now)).toEqual({ kind: "revoked" });
  });
  it("sorts active by name, revoked last", () => {
    const s = (name: string, revoked: boolean): Screen => ({ id: name, name, theme: "tenang", layout: "full", last_seen_at: null, revoked_at: revoked ? "x" : null, app_version: null, created_at: "" });
    expect(sortScreens([s("Pintu", false), s("Lama", true), s("Dewan", false)]).map((x) => x.name)).toEqual(["Dewan", "Pintu", "Lama"]);
  });
});
describe("round 2 choices and the poster-layout suggestion (PRD round 2 §6)", () => {
  it("7 themes and 4 layouts when round 2 is visible; 3 and 3 when hidden", () => {
    expect(themeChoices(true)).toEqual(["alam", "serambi", "tenang", "falak", "garis", "kerawang", "seterusnya"]);
    expect(layoutChoices(true)).toEqual(["full", "bottom", "side", "poster"]);
    expect(themeChoices(false)).toEqual(["alam", "serambi", "tenang"]);
    expect(layoutChoices(false)).toEqual(["full", "bottom", "side"]);
  });
  it("hidden round 2 still lists a screen's own round-2 value", () => {
    expect(themeChoices(false, "garis")).toEqual(["alam", "serambi", "tenang", "garis"]);
    expect(layoutChoices(false, "poster")).toEqual(["full", "bottom", "side", "poster"]);
    expect(themeChoices(false, "alam")).toEqual(["alam", "serambi", "tenang"]);
  });
  it("suggests Pengumuman sahaja only with exactly one active screen, not dismissed, round 2 visible", () => {
    const one = [{ revoked_at: null }];
    expect(suggestPosterLayout(one, false, true)).toBe(true);
    expect(suggestPosterLayout(one, true, true)).toBe(false);
    expect(suggestPosterLayout(one, false, false)).toBe(false);
    expect(suggestPosterLayout([], false, true)).toBe(false);
    expect(suggestPosterLayout(null, false, true)).toBe(false);
    expect(suggestPosterLayout([{ revoked_at: null }, { revoked_at: null }], false, true)).toBe(false);
    expect(suggestPosterLayout([{ revoked_at: null }, { revoked_at: "2026-10-01" }], false, true)).toBe(true);
  });
});

describe("Bunyi (sound, _specs/50-PRD-sound.md D9)", () => {
  const OFF = { enabled: false, volume: 70, azan: "chime", iqamah: "hayya" } as const;
  const ON = { enabled: true, volume: 40, azan: "beep", iqamah: "alarm" } as const;
  const row = (over: Partial<Screen> = {}): Pick<Screen, "name" | "theme" | "layout" | "sound"> => ({ name: "Dewan", theme: "tenang", layout: "full", sound: { ...OFF }, ...over });

  it("the section is hidden on a poster screen only", () => {
    expect(soundSectionVisible("poster")).toBe(false);
    for (const l of ["full", "bottom", "side"] as const) expect(soundSectionVisible(l)).toBe(true);
  });

  it("five choices per cue, in the sheet's order", () => {
    expect(SOUND_CHOICES).toEqual(["off", "beep", "chime", "alarm", "hayya"]);
  });

  it("soundOf: the stored setting, or off when the row has none (before migration 0011)", () => {
    expect(soundOf({ sound: { ...ON } })).toEqual(ON);
    expect(soundOf({ sound: null })).toEqual(OFF);
    expect(soundOf({})).toEqual(OFF);
  });

  it("validation matches the database check", () => {
    expect(soundError(ON)).toBeNull();
    expect(soundError({ ...ON, volume: 0 })).toBeNull();
    expect(soundError({ ...ON, volume: 100 })).toBeNull();
    expect(soundError({ ...ON, volume: 150 })).toBe("screens.sound.err.volume");
    expect(soundError({ ...ON, volume: -5 })).toBe("screens.sound.err.volume");
    expect(soundError({ ...ON, volume: 70.5 })).toBe("screens.sound.err.volume");
    expect(soundError({ ...ON, volume: "70" })).toBe("screens.sound.err.volume");
    expect(soundError({ ...ON, azan: "banana" })).toBe("screens.sound.err.invalid");
    expect(soundError({ ...ON, enabled: "yes" })).toBe("screens.sound.err.invalid");
    expect(soundError({ ...ON, extra: 1 })).toBe("screens.sound.err.invalid");
    expect(soundError({ enabled: true, volume: 40, azan: "beep" })).toBe("screens.sound.err.invalid");
    expect(soundError("on")).toBe("screens.sound.err.invalid");
    expect(soundError([ON])).toBe("screens.sound.err.invalid");
    expect(soundError(null)).toBe("screens.sound.err.invalid");
  });

  it("save sends sound only when it changed", () => {
    expect(screenUpdate(row(), { name: " Dewan ", theme: "tenang", layout: "full", sound: { ...OFF } }, true)).toEqual({ name: "Dewan", theme: "tenang", layout: "full" });
    expect(screenUpdate(row(), { name: "Dewan", theme: "tenang", layout: "full", sound: { ...ON } }, true)).toEqual({ name: "Dewan", theme: "tenang", layout: "full", sound: ON });
  });

  it("switching the layout to poster in the same sheet: the sound change is not sent, the stored value stays", () => {
    expect(screenUpdate(row(), { name: "Dewan", theme: "tenang", layout: "poster", sound: { ...ON } }, true)).toEqual({ name: "Dewan", theme: "tenang", layout: "poster" });
  });

  it("before migration 0011 (no sound column) sound is never sent", () => {
    expect(screenUpdate(row({ sound: undefined }), { name: "Dewan", theme: "tenang", layout: "full", sound: { ...ON } }, false)).not.toHaveProperty("sound");
  });
});
