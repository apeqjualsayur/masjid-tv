import { describe, expect, it } from "vitest";
import { FRESH_MS, decisionEmail, escapeHtml, mayNotify, ownerEmail, type OrgForEmail } from "./email";

const NOW = Date.parse("2026-10-22T10:00:00Z");
const org = (over: Partial<OrgForEmail> = {}): OrgForEmail => ({
  id: "org-1", kind: "surau", full_name: "Surau Al-Hidayah <Taman & Melati>", short_name: "Al-Hidayah",
  state: "Selangor", district: "Gombak", zone: "SGR01", contact_phone: "012-345 6789",
  status: "pending", status_reason: null, created_by: "user-r", created_at: "2026-10-22T09:55:00Z", reviewed_at: null, ...over,
});

describe("mayNotify", () => {
  it("registered: only the registrant, while pending, within 15 minutes", () => {
    expect(mayNotify("registered", org(), "user-r", false, NOW)).toEqual({ ok: true });
    expect(mayNotify("registered", org(), "someone-else", true, NOW)).toMatchObject({ ok: false, status: 403 });
    expect(mayNotify("registered", org({ status: "active" }), "user-r", false, NOW)).toMatchObject({ ok: false, error: "not_pending" });
    expect(mayNotify("registered", org({ created_at: new Date(NOW - FRESH_MS - 1000).toISOString() }), "user-r", false, NOW)).toMatchObject({ ok: false, error: "too_old" });
  });
  it("reviewed: only a platform owner, after approve or reject, within 15 minutes", () => {
    const approved = org({ status: "active", reviewed_at: "2026-10-22T09:59:00Z" });
    expect(mayNotify("reviewed", approved, "owner", true, NOW)).toEqual({ ok: true });
    expect(mayNotify("reviewed", approved, "user-r", false, NOW)).toMatchObject({ ok: false, status: 403 });
    expect(mayNotify("reviewed", org({ status: "rejected", reviewed_at: "2026-10-22T09:59:00Z" }), "owner", true, NOW)).toEqual({ ok: true });
    expect(mayNotify("reviewed", org({ status: "suspended", reviewed_at: "2026-10-22T09:59:00Z" }), "owner", true, NOW)).toMatchObject({ ok: false, error: "not_decided" });
    expect(mayNotify("reviewed", org({ status: "active", reviewed_at: "2026-10-22T08:00:00Z" }), "owner", true, NOW)).toMatchObject({ ok: false, error: "too_old" });
    expect(mayNotify("reviewed", org({ status: "active" }), "owner", true, NOW)).toMatchObject({ ok: false, error: "too_old" });
  });
});

describe("e-mail content", () => {
  it("escapes user text in HTML", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
    const mail = ownerEmail(org(), "ajk@example.com", ["owner@example.com"], "https://masjidview.my");
    expect(mail.html).toContain("Surau Al-Hidayah &lt;Taman &amp; Melati&gt;");
    expect(mail.html).not.toContain("<Taman");
  });
  it("owner e-mail: details, platform link, one send per org", () => {
    const mail = ownerEmail(org(), "ajk@example.com", ["owner@example.com"], "https://masjidview.my");
    expect(mail.to).toEqual(["owner@example.com"]);
    expect(mail.subject).toBe("Pendaftaran baharu: Surau Al-Hidayah <Taman & Melati>");
    expect(mail.text).toContain("Lokasi: Gombak, Selangor · SGR01");
    expect(mail.text).toContain("Didaftar oleh: ajk@example.com");
    expect(mail.html).toContain("https://masjidview.my/admin/platform/");
    expect(mail.idempotencyKey).toBe("registered-org-1");
  });
  it("approval e-mail in BM and English", () => {
    const o = org({ status: "active", reviewed_at: "2026-10-22T09:59:00Z" });
    const ms = decisionEmail(o, "ajk@example.com", "ms", "https://masjidview.my");
    expect(ms.subject).toBe("Surau Al-Hidayah <Taman & Melati> telah diluluskan");
    expect(ms.text).toContain("masjidview.my/tv");
    expect(ms.html).toContain("https://masjidview.my/admin/");
    const en = decisionEmail(o, "ajk@example.com", "en", "https://masjidview.my");
    expect(en.subject).toBe("Surau Al-Hidayah <Taman & Melati> has been approved");
    expect(en.idempotencyKey).toBe("reviewed-org-1-active-2026-10-22T09:59:00Z");
  });
  it("rejection e-mail carries the reason, escaped", () => {
    const o = org({ status: "rejected", status_reason: "Butiran <tidak> lengkap", reviewed_at: "2026-10-22T09:59:00Z" });
    const mail = decisionEmail(o, "ajk@example.com", "ms", "https://masjidview.my");
    expect(mail.subject).toBe("Pendaftaran Surau Al-Hidayah <Taman & Melati> tidak diluluskan");
    expect(mail.text).toContain("Sebab: Butiran <tidak> lengkap");
    expect(mail.html).toContain("Sebab: Butiran &lt;tidak&gt; lengkap");
    expect(mail.to).toEqual(["ajk@example.com"]);
  });
});