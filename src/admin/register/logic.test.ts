import { describe, expect, it, vi } from "vitest";
import { monogram } from "../shell/monogram";
import type { ZoneChoice } from "../ZonePicker/logic";
import { errorKeyOf, fitWithin, registerArgs, submitRegistration, validateRegistration, type LogoFile, type RegisterBackend, type RegisterForm } from "./logic";

const zone: ZoneChoice = { zone: "SGR01", state: "Selangor", district: "Gombak", source: "area" };
const good: RegisterForm & { zone: ZoneChoice } = {
  kind: "masjid", fullName: "  Masjid Nur Muhammad, Taman Melati ", shortName: " Nur Muhammad ", zone, address: "", phone: "012-345 6789",
};

describe("validateRegistration (schema limits)", () => {
  it("accepts a complete form", () => {
    expect(validateRegistration(good)).toEqual({});
  });
  it("full name 3 to 120 characters", () => {
    expect(validateRegistration({ ...good, fullName: "  " }).fullName).toBe("register.err.fullNameRequired");
    expect(validateRegistration({ ...good, fullName: "Ab" }).fullName).toBe("register.err.fullNameLength");
    expect(validateRegistration({ ...good, fullName: "A".repeat(120) }).fullName).toBeUndefined();
    expect(validateRegistration({ ...good, fullName: "A".repeat(121) }).fullName).toBe("register.err.fullNameLength");
  });
  it("short name 1 to 40 characters", () => {
    expect(validateRegistration({ ...good, shortName: "" }).shortName).toBe("register.err.shortNameRequired");
    expect(validateRegistration({ ...good, shortName: "N".repeat(40) }).shortName).toBeUndefined();
    expect(validateRegistration({ ...good, shortName: "N".repeat(41) }).shortName).toBe("register.err.shortNameLength");
  });
  it("zone is required, address optional up to 300", () => {
    expect(validateRegistration({ ...good, zone: null }).zone).toBe("register.err.zoneRequired");
    expect(validateRegistration({ ...good, address: "x".repeat(300) }).address).toBeUndefined();
    expect(validateRegistration({ ...good, address: "x".repeat(301) }).address).toBe("register.err.addressLength");
  });
  it("phone: required, Malaysian formats, max 20 characters", () => {
    for (const ok of ["0123456789", "012-345 6789", "+60 12-345 6789", "03-6201 1234", "(03) 6201 1234"]) expect(validateRegistration({ ...good, phone: ok }).phone).toBeUndefined();
    expect(validateRegistration({ ...good, phone: "" }).phone).toBe("register.err.phoneRequired");
    for (const bad of ["12345", "012-abc-6789", "+60 12 345 6789 0000 1", "phone me"]) expect(validateRegistration({ ...good, phone: bad }).phone).toBe("register.err.phoneInvalid");
  });
});

describe("registerArgs", () => {
  it("trims and turns empty optional fields into null", () => {
    expect(registerArgs(good)).toEqual({
      p_kind: "masjid", p_full_name: "Masjid Nur Muhammad, Taman Melati", p_short_name: "Nur Muhammad",
      p_state: "Selangor", p_district: "Gombak", p_zone: "SGR01", p_address: null, p_phone: "012-345 6789",
    });
  });
});

describe("errorKeyOf", () => {
  it("maps database and network errors to friendly messages", () => {
    expect(errorKeyOf({ message: "already_has_org", code: "P0001" })).toBe("register.err.alreadyHasOrg");
    expect(errorKeyOf({ message: "not_authenticated", code: "28000" })).toBe("register.err.signedOut");
    expect(errorKeyOf({ message: "JWT expired" })).toBe("register.err.signedOut");
    expect(errorKeyOf({ message: "new row violates check constraint", code: "23514" })).toBe("register.err.invalid");
    expect(errorKeyOf(new TypeError("Failed to fetch"))).toBe("register.err.network");
    expect(errorKeyOf({ message: "something else" })).toBe("register.err.generic");
    expect(errorKeyOf(null)).toBe("register.err.generic");
  });
});

describe("fitWithin (logo at most 512 px)", () => {
  it("shrinks keeping the aspect ratio, never enlarges", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 512, height: 384 });
    expect(fitWithin(1000, 2000)).toEqual({ width: 256, height: 512 });
    expect(fitWithin(300, 200)).toEqual({ width: 300, height: 200 });
    expect(fitWithin(0, 10)).toEqual({ width: 1, height: 1 });
  });
});

describe("monogram", () => {
  it("two letters from the short name", () => {
    expect(monogram("Nur Muhammad")).toBe("NM");
    expect(monogram("Al-Ikhlas")).toBe("AL");
    expect(monogram("", "Masjid Nur Muhammad")).toBe("NM");
    expect(monogram("")).toBe("");
  });
});

function backend(over: Partial<RegisterBackend> = {}) {
  const calls: string[] = [];
  const b: RegisterBackend = {
    registerOrg: vi.fn(async () => (calls.push("register_org"), "org-1")),
    uploadObject: vi.fn(async (path: string) => void calls.push(`upload ${path}`)),
    insertMedia: vi.fn(async (row) => void calls.push(`media ${row.path} ${row.kind} ${row.width}x${row.height} ${row.bytes}`)),
    setOrgLogo: vi.fn(async (org: string, path: string) => void calls.push(`set_org_logo ${org} ${path}`)),
    deleteMedia: vi.fn(async (path: string) => void calls.push(`delete media ${path}`)),
    removeObject: vi.fn(async (path: string) => void calls.push(`remove ${path}`)),
    ...over,
  };
  return { b, calls };
}
const logo: LogoFile = { blob: new Blob([new Uint8Array(1234)], { type: "image/webp" }), width: 512, height: 384, ext: "webp" };

describe("submitRegistration order", () => {
  it("without a logo only calls register_org", async () => {
    const { b, calls } = backend();
    expect(await submitRegistration(b, good, null, () => "u1")).toEqual({ orgId: "org-1", logo: "none" });
    expect(calls).toEqual(["register_org"]);
  });

  it("register_org first, then upload, media row and set_org_logo", async () => {
    const { b, calls } = backend();
    expect(await submitRegistration(b, good, logo, () => "u1")).toEqual({ orgId: "org-1", logo: "ok" });
    expect(calls).toEqual(["register_org", "upload org-1/u1.webp", "media org-1/u1.webp logo 512x384 1234", "set_org_logo org-1 org-1/u1.webp"]);
  });

  it("a failed registration uploads nothing", async () => {
    const { b, calls } = backend({ registerOrg: vi.fn(async () => Promise.reject({ message: "already_has_org" })) });
    await expect(submitRegistration(b, good, logo, () => "u1")).rejects.toEqual({ message: "already_has_org" });
    expect(calls).toEqual([]);
  });

  it("a failed upload keeps the registration", async () => {
    const { b, calls } = backend({ uploadObject: vi.fn(async () => Promise.reject(new Error("413"))) });
    expect(await submitRegistration(b, good, logo, () => "u1")).toEqual({ orgId: "org-1", logo: "failed" });
    expect(calls).toEqual(["register_org"]);
  });

  it("if the logo cannot be set, the row and file are removed again", async () => {
    const { b, calls } = backend({ setOrgLogo: vi.fn(async () => Promise.reject({ message: "not_allowed" })) });
    expect(await submitRegistration(b, good, logo, () => "u1")).toEqual({ orgId: "org-1", logo: "failed" });
    expect(calls).toEqual(["register_org", "upload org-1/u1.webp", "media org-1/u1.webp logo 512x384 1234", "delete media org-1/u1.webp", "remove org-1/u1.webp"]);
  });

  it("uses .png when the browser could not encode WebP", async () => {
    const { b, calls } = backend();
    await submitRegistration(b, good, { ...logo, ext: "png" }, () => "u1");
    expect(calls[1]).toBe("upload org-1/u1.png");
    expect(b.uploadObject).toHaveBeenCalledWith("org-1/u1.png", logo.blob, "image/png");
  });
});