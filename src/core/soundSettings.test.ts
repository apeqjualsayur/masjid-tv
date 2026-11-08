import { describe, expect, it } from "vitest";
import { DEFAULT_SOUND, applySoundOverrides, parseSoundSettings, soundVolume } from "./soundSettings";

describe("parseSoundSettings", () => {
  it("missing or junk → the defaults (OFF)", () => {
    expect(DEFAULT_SOUND).toEqual({ enabled: false, volume: 70, azan: "chime", iqamah: "hayya" });
    expect(parseSoundSettings(undefined)).toEqual(DEFAULT_SOUND);
    expect(parseSoundSettings("on")).toEqual(DEFAULT_SOUND);
    expect(parseSoundSettings([1, 2])).toEqual(DEFAULT_SOUND);
  });

  it("valid fields are kept, invalid ones fall back one by one", () => {
    expect(parseSoundSettings({ enabled: true, volume: 40, azan: "beep", iqamah: "alarm" })).toEqual({ enabled: true, volume: 40, azan: "beep", iqamah: "alarm" });
    expect(parseSoundSettings({ enabled: "yes", volume: 140, azan: "trumpet", iqamah: "off" })).toEqual({ ...DEFAULT_SOUND, iqamah: "off" });
    expect(parseSoundSettings({ enabled: true })).toEqual({ ...DEFAULT_SOUND, enabled: true });
  });

  it("volume: 0–100, rounded; strings from URL params work", () => {
    expect(soundVolume(0)).toBe(0);
    expect(soundVolume(100)).toBe(100);
    expect(soundVolume(55.6)).toBe(56);
    expect(soundVolume("30")).toBe(30);
    expect(soundVolume(-1)).toBeNull();
    expect(soundVolume(101)).toBeNull();
    expect(soundVolume("")).toBeNull();
    expect(soundVolume(NaN)).toBeNull();
  });
});

describe("applySoundOverrides", () => {
  it("none → unchanged", () => {
    expect(applySoundOverrides(DEFAULT_SOUND, undefined)).toBe(DEFAULT_SOUND);
  });

  it("overrides only what is given", () => {
    expect(applySoundOverrides(DEFAULT_SOUND, { enabled: true, azan: "alarm" })).toEqual({ ...DEFAULT_SOUND, enabled: true, azan: "alarm" });
    expect(applySoundOverrides(DEFAULT_SOUND, { volume: 20, iqamah: "beep" })).toEqual({ ...DEFAULT_SOUND, volume: 20, iqamah: "beep" });
  });

  it("mute wins over sound=1 and over a screen that has sound on", () => {
    expect(applySoundOverrides(DEFAULT_SOUND, { enabled: true, mute: true }).enabled).toBe(false);
    expect(applySoundOverrides({ ...DEFAULT_SOUND, enabled: true }, { mute: true }).enabled).toBe(false);
  });
});
