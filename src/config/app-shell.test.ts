import { describe, expect, it } from "vitest";
import { apkBehind, appVersionWithShell, compareVersions, formatMegabytes, parseAppVersion, parseLatestApk, resolveShell } from "./app-shell";
import { buildTimeOf, isOutdated } from "./release";

const WEB = "0.1.0 (2026-11-20 10:02)";

describe("which shell runs the TV page", () => {
  it("?shell=apk&shellv=1.0.0 → the app, remembered", () => {
    expect(resolveShell("?shell=apk&shellv=1.0.0", null)).toEqual({ shell: { kind: "apk", version: "1.0.0" }, store: '{"kind":"apk","version":"1.0.0"}' });
  });
  it("no query → the remembered one (a reload, the nightly restart)", () => {
    expect(resolveShell("", '{"kind":"apk","version":"1.2.0"}')).toEqual({ shell: { kind: "apk", version: "1.2.0" } });
    expect(resolveShell("?debug=1", null)).toEqual({ shell: null });
  });
  it("a newer app version in the URL replaces the remembered one", () => {
    expect(resolveShell("?shell=apk&shellv=1.1.0", '{"kind":"apk","version":"1.0.0"}').shell).toEqual({ kind: "apk", version: "1.1.0" });
  });
  it("?shell=none (or a bad version) clears it", () => {
    expect(resolveShell("?shell=none", '{"kind":"apk","version":"1.0.0"}')).toEqual({ shell: null, store: null });
    expect(resolveShell("?shell=apk&shellv=<script>", null)).toEqual({ shell: null, store: null });
    expect(resolveShell("?shell=apk", null)).toEqual({ shell: null, store: null });
  });
  it("broken stored values are ignored", () => {
    expect(resolveShell("", "not json")).toEqual({ shell: null });
    expect(resolveShell("", '{"kind":"apk","version":"x"}')).toEqual({ shell: null });
  });
});

describe("app_version (PRD enhancements §8.3)", () => {
  it("<web>+apk<x.y.z> inside the app, the web version in a browser", () => {
    expect(appVersionWithShell(WEB, { kind: "apk", version: "1.0.0" })).toBe(`${WEB}+apk1.0.0`);
    expect(appVersionWithShell(WEB, null)).toBe(WEB);
  });
  it("parses back into web + app", () => {
    expect(parseAppVersion(`${WEB}+apk1.0.0`)).toEqual({ web: WEB, apk: "1.0.0" });
    expect(parseAppVersion(WEB)).toEqual({ web: WEB, apk: null });
    expect(parseAppVersion("dev+apk1.2")).toEqual({ web: "dev", apk: "1.2" });
    expect(parseAppVersion(null)).toEqual({ web: null, apk: null });
    expect(parseAppVersion(`${WEB}+apkjunk`)).toEqual({ web: WEB, apk: null });
  });
  it("the build-time check for outdated TVs still reads the web build", () => {
    expect(buildTimeOf(`${WEB}+apk1.0.0`)).toBe("2026-11-20 10:02");
    expect(isOutdated(`${WEB}+apk1.0.0`, "2026-11-20 10:00")).toBe(false);
    expect(isOutdated(`0.1.0 (2026-11-19 09:00)+apk1.0.0`, "2026-11-20 10:00")).toBe(true);
  });
});

describe("versions and latest.json", () => {
  it("compares dotted versions numerically", () => {
    expect(compareVersions("1.0.10", "1.0.9")).toBe(1);
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.2.0", "1.10.0")).toBe(-1);
  });
  const latest = { versionCode: 3, versionName: "1.1.0", sha256: "ab", bytes: 2_412_544, date: "2026-11-21T03:00:00Z", notes: "Baharu" };
  it("parses latest.json; rejects broken ones", () => {
    expect(parseLatestApk(latest)).toEqual(latest);
    expect(parseLatestApk({ ...latest, notes: undefined, sha256: 5 })).toEqual({ ...latest, notes: "", sha256: "" });
    expect(parseLatestApk(null)).toBeNull();
    expect(parseLatestApk({ ...latest, versionName: "v1" })).toBeNull();
    expect(parseLatestApk({ ...latest, bytes: 0 })).toBeNull();
    expect(parseLatestApk({ ...latest, date: "soon" })).toBeNull();
  });
  it("'Kemas kini tersedia' only for an app older than the published one; never for a browser", () => {
    const l = parseLatestApk(latest);
    expect(apkBehind(`${WEB}+apk1.0.0`, l)).toBe(true);
    expect(apkBehind(`${WEB}+apk1.1.0`, l)).toBe(false);
    expect(apkBehind(`${WEB}+apk1.2.0`, l)).toBe(false);
    expect(apkBehind(WEB, l)).toBe(false);
    expect(apkBehind(`${WEB}+apk1.0.0`, null)).toBe(false);
  });
  it("size in MB", () => {
    expect(formatMegabytes(2_412_544)).toBe("2.3 MB");
    expect(formatMegabytes(15 * 1024 * 1024)).toBe("15 MB");
  });
});
