import { describe, expect, it } from "vitest";
import { formatCountdown, formatGregorian, formatHijri, formatMmSs, formatSeconds, formatTime } from "./format";
import { parseLocalDateTime } from "./time";

const at = (s: string) => parseLocalDateTime(s)!;

describe("formatTime", () => {
  it("12-hour without AM/PM", () => {
    expect(formatTime(at("2026-10-17T13:05:00"))).toBe("1:05");
    expect(formatTime(at("2026-10-17T07:06:00"))).toBe("7:06");
    expect(formatTime(at("2026-10-17T20:11:00"))).toBe("8:11");
  });
  it("midnight and noon read 12", () => {
    expect(formatTime(at("2026-10-17T00:05:00"))).toBe("12:05");
    expect(formatTime(at("2026-10-17T12:00:00"))).toBe("12:00");
  });
  it("24-hour when configured", () => {
    expect(formatTime(at("2026-10-17T13:05:00"), true)).toBe("13:05");
    expect(formatTime(at("2026-10-17T07:06:00"), true)).toBe("07:06");
    expect(formatTime(at("2026-10-17T00:00:00"), true)).toBe("00:00");
  });
  it("seconds are zero-padded", () => {
    expect(formatSeconds(at("2026-10-17T13:05:08"))).toBe("08");
  });
});

describe("formatGregorian", () => {
  it("Malay day and month names", () => {
    expect(formatGregorian(at("2026-10-17T13:00:00"))).toBe("Sabtu, 17 Oktober 2026");
    expect(formatGregorian(at("2026-10-16T09:00:00"))).toBe("Jumaat, 16 Oktober 2026");
    expect(formatGregorian(at("2026-08-02T09:00:00"))).toBe("Ahad, 2 Ogos 2026");
    expect(formatGregorian(at("2026-03-04T09:00:00"))).toBe("Rabu, 4 Mac 2026");
  });
  it("uses Malaysia time just after midnight", () => {
    expect(formatGregorian(at("2026-10-18T00:00:01"))).toBe("Ahad, 18 Oktober 2026");
  });
});

describe("formatHijri", () => {
  it("API string to Malay Hijri date", () => {
    expect(formatHijri("1448-05-06")).toBe("6 Jamadilawal 1448H");
    expect(formatHijri("1448-09-01")).toBe("1 Ramadan 1448H");
    expect(formatHijri("1448-12-10")).toBe("10 Zulhijjah 1448H");
    expect(formatHijri("1449-01-01")).toBe("1 Muharram 1449H");
  });
  it("returns empty for bad input", () => {
    expect(formatHijri("")).toBe("");
    expect(formatHijri("1448-13-01")).toBe("");
    expect(formatHijri("06/05/1448")).toBe("");
  });
});

describe("formatCountdown", () => {
  const min = 60_000;
  it("matches the design strings", () => {
    expect(formatCountdown((2 * 60 + 51) * min)).toBe("2 jam 51 minit");
    expect(formatCountdown(49 * min)).toBe("49 minit");
    expect(formatCountdown(61 * min)).toBe("1 jam 01 minit");
    expect(formatCountdown((8 * 60 + 12) * min)).toBe("8 jam 12 minit");
  });
  it("rounds up partial minutes, never 0 while time remains", () => {
    expect(formatCountdown(1000)).toBe("1 minit");
    expect(formatCountdown(48 * min + 1)).toBe("49 minit");
    expect(formatCountdown(59 * min + 30_000)).toBe("1 jam 00 minit");
    expect(formatCountdown(0)).toBe("0 minit");
  });
});

describe("formatMmSs", () => {
  it("countdown clock", () => {
    expect(formatMmSs(600)).toBe("10:00");
    expect(formatMmSs(59)).toBe("0:59");
    expect(formatMmSs(0)).toBe("0:00");
    expect(formatMmSs(2400)).toBe("40:00");
    expect(formatMmSs(3725)).toBe("1:02:05");
    expect(formatMmSs(592, true)).toBe("09:52");
    expect(formatMmSs(600, true)).toBe("10:00");
  });
});
