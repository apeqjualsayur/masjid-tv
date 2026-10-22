import { describe, expect, it } from "vitest";
import ms from "../i18n/ms.json";
import { translate } from "../i18n";
import { canLeave, emailOk, memberErrorKey, openInvitation, slots, whatsappUrl, type InvitationRow, type MemberRow } from "./logic";

const NOW = Date.parse("2026-10-23T10:00:00Z");
const me: MemberRow = { user_id: "u1", email: "ajk@contoh.my", display_name: "Ahmad", created_at: "2026-10-01T00:00:00Z", is_me: true };
const other: MemberRow = { user_id: "u2", email: "kedua@contoh.my", display_name: null, created_at: "2026-10-10T00:00:00Z", is_me: false };
const inv = (over: Partial<InvitationRow> = {}): InvitationRow => ({ id: "i1", email: "baru@contoh.my", created_at: "2026-10-20T00:00:00Z", expires_at: "2026-11-03T00:00:00Z", accepted_at: null, ...over });

describe("two admin slots", () => {
  it("one admin: second slot empty → invite", () => {
    expect(slots([me], [], NOW)).toEqual([{ kind: "member", member: me }, { kind: "empty" }]);
  });
  it("one admin with an open invitation: second slot shows it", () => {
    expect(slots([me], [inv()], NOW)).toEqual([{ kind: "member", member: me }, { kind: "invited", invitation: inv() }]);
  });
  it("an expired or accepted invitation does not count", () => {
    expect(slots([me], [inv({ expires_at: "2026-10-22T00:00:00Z" })], NOW)[1]).toEqual({ kind: "empty" });
    expect(openInvitation([inv({ accepted_at: "2026-10-21T00:00:00Z" })], NOW)).toBeNull();
  });
  it("two admins: both shown, oldest first, no invitation slot", () => {
    expect(slots([other, me], [inv()], NOW)).toEqual([{ kind: "member", member: me }, { kind: "member", member: other }]);
  });
  it("leave only when the other admin stays", () => {
    expect(canLeave([me])).toBe(false);
    expect(canLeave([me, other])).toBe(true);
  });
});

describe("messages", () => {
  it("database errors map to the friendly BM texts", () => {
    expect(memberErrorKey({ message: "user_has_org", code: "P0001" })).toBe("members.err.user_has_org");
    expect(translate("ms", memberErrorKey({ message: "user_has_org" }))).toBe("E-mel ini sudah mengurus masjid lain.");
    for (const c of ["org_full", "invite_pending", "org_not_active", "bad_email", "last_pentadbir"]) expect(memberErrorKey({ message: c })).toBe(`members.err.${c}`);
    expect(memberErrorKey({ message: "permission denied", code: "42501" })).toBe("members.err.not_allowed");
    expect(memberErrorKey({ message: "TypeError: Failed to fetch" })).toBe("members.err.network");
    expect(memberErrorKey(null)).toBe("members.err.generic");
  });
  it("share message (BM) as specified", () => {
    expect(translate("ms", "members.shareText", { masjid: "Masjid Al-Hidayah", email: "baru@contoh.my", url: "https://masjidview.my/admin" })).toBe(
      "Anda dijemput sebagai pentadbir paparan Masjid View untuk Masjid Al-Hidayah. Log masuk dengan e-mel baru@contoh.my di https://masjidview.my/admin dalam 14 hari.",
    );
    expect(ms.members.removeBody).toBe("{email} akan hilang akses serta-merta.");
    expect(whatsappUrl("a b&c")).toBe("https://wa.me/?text=a%20b%26c");
  });
  it("email check", () => {
    expect(emailOk("nama@contoh.com")).toBe(true);
    expect(emailOk("nama@contoh")).toBe(false);
    expect(emailOk("bukan e-mel")).toBe(false);
  });
});