import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { gisLocale, gisWidth, googleClientId, makeNonce } from "./google-signin";

describe("google sign-in helpers", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("nonce: Google gets the SHA-256 of the raw value Supabase gets", async () => {
    const { raw, hashed } = await makeNonce();
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    expect(hashed).toBe(createHash("sha256").update(raw).digest("hex"));
    expect((await makeNonce()).raw).not.toBe(raw);
  });

  it("button language follows the page", () => {
    expect(gisLocale("ms")).toBe("ms");
    expect(gisLocale("en")).toBe("en");
    expect(gisLocale("en-MY")).toBe("en");
  });

  it("button width stays within Google's 200–400 px", () => {
    expect(gisWidth(392)).toBe(392);
    expect(gisWidth(120)).toBe(200);
    expect(gisWidth(900)).toBe(400);
  });

  it("no client id → null (the page keeps the redirect flow)", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
    expect(googleClientId()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", " 123.apps.googleusercontent.com ");
    expect(googleClientId()).toBe("123.apps.googleusercontent.com");
  });
});
