import { afterEach, describe, expect, it, vi } from "vitest";
import { logError, redact } from "./log";

afterEach(() => vi.restoreAllMocks());

describe("admin error log", () => {
  it("never prints keys, tokens or passwords", () => {
    // Fake values, assembled at runtime so secret scanners do not mistake this file for a leak.
    const jwt = ["eyJ" + "hbGciOiJIUzI1NiJ9", "eyJ" + "yb2xlIjoidGVzdCJ9", "ZmFrZS1zaWduYXR1cmUtZmFrZQ"].join(".");
    const sbSecret = "sb_" + "secret_" + "FAKEFAKEFAKEFAKE";
    const sbPublishable = "sb_" + "publishable_" + "FAKEFAKEFA";
    const sbp = "sb" + "p_" + "0000000000fake0000000000";
    const resend = "r" + "e_" + "FAKEFAKEFAKEFAKEFAKE";
    const out = redact(
      `apikey: ${jwt} Authorization: Bearer abc.def.ghi ${sbSecret} ${sbPublishable} ${sbp} ${resend} ?access_token=xyz&refresh_token=uvw password=hunter2 /admin/?code=pkce123 postgresql://postgres.ref:S3cr3t@host:5432/postgres`,
    );
    for (const secret of [jwt, "abc.def.ghi", sbSecret, sbPublishable, sbp, resend, "xyz", "uvw", "hunter2", "pkce123", "S3cr3t"]) {
      expect(out).not.toContain(secret);
    }
    expect(out).toContain("postgresql://postgres.ref:[redacted]@host");
  });

  it("logs with context and the Supabase error fields", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const line = logError({ where: "settings.save", table: "org_settings" }, { message: "permission denied", code: "42501", hint: "check RLS" });
    expect(spy).toHaveBeenCalledOnce();
    expect(line).toContain("where=settings.save");
    expect(line).toContain("table=org_settings");
    expect(line).toContain("permission denied code=42501 hint=check RLS");
  });

  it("an Error keeps its stack; a token inside the message is removed", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const line = logError({ where: "x" }, new Error("failed with token_hash=abcdef123"));
    expect(line).toContain("Error: failed with token_hash=[redacted]");
    expect(line).toContain("at ");
  });
});