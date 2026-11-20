import { describe, expect, it } from "vitest";
import { parseLocalDateTime } from "@/core";
import {
  applyNotice, cleanPenangguhan, endOfDay, noticeEndsAt, noticeInputOf, noticeOf, penangguhanEndsAt, supportsNotice, validateActivityExtras, validateNotice, withdrawNotice,
  type NoticeRow,
} from "./notice";
import { validateFields } from "./schema";

const at = (s: string) => parseLocalDateTime(s)!;
const H = 3_600_000;
const NOW = at("2026-11-20T10:00");
const KULIAH = { series: "Kuliah Maghrib", topic: "Adab", speaker: "Ust. A", date: "Sabtu, 28 November 2026", dateIso: "2026-11-28", time: "8:45 malam", venue: "Dewan" };
const row = (endsAt: number | null, priority = false, fields: Record<string, unknown> = KULIAH): NoticeRow => ({ fields, priority, endsAt });

describe("ends_at rules (PRD enhancements §3.3)", () => {
  it("end of day = 23:59 Malaysia time", () => {
    expect(endOfDay("2026-11-28")).toBe(at("2026-11-28T23:59"));
    expect(endOfDay("nope")).toBeNull();
  });

  it("Tangguh with a new date: max(current ends_at, newAt + 3 h)", () => {
    const newAtMs = at("2026-12-05T20:45");
    // current ends earlier → extended to newAt + 3 h
    expect(noticeEndsAt({ kind: "tangguh", newAtMs, eventDateIso: "2026-11-28", currentEndsAt: at("2026-11-28T23:59"), now: NOW })).toEqual({ endsAt: newAtMs + 3 * H, shortens: false });
    // current ends later → kept
    expect(noticeEndsAt({ kind: "tangguh", newAtMs, eventDateIso: "2026-11-28", currentEndsAt: at("2026-12-31T23:59"), now: NOW }).endsAt).toBe(at("2026-12-31T23:59"));
    // no end → stays without an end
    expect(noticeEndsAt({ kind: "tangguh", newAtMs, eventDateIso: "2026-11-28", currentEndsAt: null, now: NOW }).endsAt).toBeNull();
  });

  it("Tangguh without a date: max(current, end of day of E, now + 24 h)", () => {
    // E is later than now + 24 h → end of E
    expect(noticeEndsAt({ kind: "tangguh", newAtMs: null, eventDateIso: "2026-11-28", currentEndsAt: at("2026-11-25T12:00"), now: NOW }).endsAt).toBe(at("2026-11-28T23:59"));
    // E is today (already near) → now + 24 h wins
    expect(noticeEndsAt({ kind: "tangguh", newAtMs: null, eventDateIso: "2026-11-20", currentEndsAt: at("2026-11-20T12:00"), now: NOW }).endsAt).toBe(NOW + 24 * H);
    // a later current end is kept
    expect(noticeEndsAt({ kind: "tangguh", newAtMs: null, eventDateIso: "2026-11-28", currentEndsAt: at("2027-01-01T00:00"), now: NOW }).endsAt).toBe(at("2027-01-01T00:00"));
    // unknown E → now + 24 h
    expect(noticeEndsAt({ kind: "tangguh", newAtMs: null, eventDateIso: null, currentEndsAt: 0, now: NOW }).endsAt).toBe(NOW + 24 * H);
  });

  it("Batal: max(end of day of E, now + 24 h); extending needs no question", () => {
    expect(noticeEndsAt({ kind: "batal", newAtMs: null, eventDateIso: "2026-11-28", currentEndsAt: at("2026-11-27T12:00"), now: NOW })).toEqual({ endsAt: at("2026-11-28T23:59"), shortens: false });
    expect(noticeEndsAt({ kind: "batal", newAtMs: null, eventDateIso: "2026-11-20", currentEndsAt: NOW, now: NOW })).toEqual({ endsAt: NOW + 24 * H, shortens: false });
  });

  it("Batal that would end a later slide earlier (or one without an end) asks first", () => {
    expect(noticeEndsAt({ kind: "batal", newAtMs: null, eventDateIso: "2026-11-28", currentEndsAt: at("2026-12-31T23:59"), now: NOW })).toEqual({ endsAt: at("2026-11-28T23:59"), shortens: true });
    expect(noticeEndsAt({ kind: "batal", newAtMs: null, eventDateIso: "2026-11-28", currentEndsAt: null, now: NOW })).toEqual({ endsAt: at("2026-11-28T23:59"), shortens: true });
  });

  it("the confirm case: yes shortens, no keeps the current end", () => {
    const r = row(at("2026-12-31T23:59"));
    const input = { kind: "batal" as const, newAt: null, reason: "Hujan" };
    expect(applyNotice(r, input, NOW).endsAt).toBe(at("2026-11-28T23:59"));
    expect(applyNotice(r, input, NOW, { keepEnd: true }).endsAt).toBe(at("2026-12-31T23:59"));
    expect(applyNotice(row(null), input, NOW, { keepEnd: true }).endsAt).toBeNull();
    // keepEnd does nothing when nothing would be shortened
    expect(applyNotice(row(at("2026-11-21T00:00")), input, NOW, { keepEnd: true }).endsAt).toBe(at("2026-11-28T23:59"));
  });
});

describe("apply / update / withdraw", () => {
  it("Tangguh: notice saved, priority on, old priority kept", () => {
    const r = applyNotice(row(at("2026-11-28T23:59"), false), { kind: "tangguh", newAt: "2026-12-05T20:45", reason: "  Penceramah uzur " }, NOW);
    expect(r.priority).toBe(true);
    expect(r.fields.notice).toEqual({ kind: "tangguh", newAt: "2026-12-05T20:45", reason: "Penceramah uzur", setAt: new Date(NOW).toISOString(), prevPriority: false });
    expect(r.fields.topic).toBe("Adab");
    expect(r.endsAt).toBe(at("2026-12-05T23:45"));
  });

  it("Batal never stores a new date; an empty reason is null", () => {
    const r = applyNotice(row(null), { kind: "batal", newAt: "2026-12-05T20:45", reason: " " }, NOW);
    expect(r.fields.notice).toMatchObject({ kind: "batal", newAt: null, reason: null });
  });

  it("an update keeps the first prevPriority (the slide was already priority because of the notice)", () => {
    const first = applyNotice(row(null, false), { kind: "tangguh", newAt: null, reason: "" }, NOW);
    const second = applyNotice(first, { kind: "batal", newAt: null, reason: "Hujan" }, NOW + H);
    expect((second.fields.notice as { prevPriority: boolean }).prevPriority).toBe(false);
  });

  it("Tarik balik: notice removed, priority restored, ends_at kept", () => {
    const applied = applyNotice(row(at("2026-12-31T23:59"), false), { kind: "tangguh", newAt: "2026-12-05T20:45", reason: "" }, NOW);
    const back = withdrawNotice(applied);
    expect(noticeOf(back.fields)).toBeNull();
    expect(back.fields).toEqual(KULIAH);
    expect(back.priority).toBe(false);
    expect(back.endsAt).toBe(applied.endsAt);
    // a slide that was priority before stays priority
    expect(withdrawNotice(applyNotice(row(null, true), { kind: "batal", newAt: null, reason: "" }, NOW)).priority).toBe(true);
    // nothing to withdraw: unchanged
    expect(withdrawNotice(row(null, true))).toEqual(row(null, true));
  });

  it("the sheet starts from the current notice of the same kind", () => {
    const f = { ...KULIAH, notice: { kind: "tangguh", newAt: null, reason: "Uzur" } };
    expect(noticeInputOf(f, "tangguh")).toEqual({ input: { kind: "tangguh", newAt: null, reason: "Uzur" }, tba: true });
    expect(noticeInputOf(f, "batal")).toEqual({ input: { kind: "batal", newAt: null, reason: "" }, tba: false });
    expect(noticeInputOf(KULIAH, "tangguh").tba).toBe(false);
  });

  it("only kuliah, program and mesyuarat carry notices", () => {
    expect(["kuliah", "program", "mesyuarat"].every((k) => supportsNotice(k as never))).toBe(true);
    expect(["kematian", "pengumuman", "penangguhan", null].some((k) => supportsNotice(k as never))).toBe(false);
  });
});

describe("notice validation", () => {
  const ok = { kind: "tangguh" as const, newAt: "2026-12-05T20:45", reason: "" };
  it("Tangguh needs a future date and time unless 'akan dimaklumkan'", () => {
    expect(validateNotice(ok, false, NOW)).toEqual({});
    expect(validateNotice({ ...ok, newAt: null }, false, NOW)).toEqual({ newAt: "required" });
    expect(validateNotice({ ...ok, newAt: null }, true, NOW)).toEqual({});
    expect(validateNotice({ ...ok, newAt: "2026-02-30T20:45" }, false, NOW)).toEqual({ newAt: "invalid" });
    expect(validateNotice({ ...ok, newAt: "2026-11-20T09:00" }, false, NOW)).toEqual({ newAt: "past" });
    expect(validateNotice({ kind: "batal", newAt: null, reason: "" }, false, NOW)).toEqual({});
  });
  it("reason: 100 characters allowed, 101 blocked (as the database does)", () => {
    expect(validateNotice({ ...ok, reason: "a".repeat(100) }, false, NOW)).toEqual({});
    expect(validateNotice({ ...ok, reason: "a".repeat(101) }, false, NOW)).toEqual({ reason: "tooLong" });
    expect(validateNotice({ ...ok, reason: `  ${"a".repeat(100)}  ` }, false, NOW)).toEqual({});
  });
  it("activity duration: whole minutes 15–600, optional", () => {
    expect(validateActivityExtras({})).toEqual({});
    expect(validateActivityExtras({ durationMin: 90 })).toEqual({});
    expect(validateActivityExtras({ durationMin: 10 })).toEqual({ durationMin: { code: "range", min: 15, max: 600 } });
    expect(validateActivityExtras({ durationMin: 45.5 })).toEqual({ durationMin: { code: "number" } });
    expect(validateActivityExtras({ durationMin: Number.NaN })).toEqual({ durationMin: { code: "number" } });
  });
});

describe("Penangguhan template (§3.5)", () => {
  const P = { title: "Kuliah: Adab", kind: "tangguh", date: "Sabtu, 28 November 2026", dateIso: "2026-11-28", time: "Selepas Maghrib" };
  it("default ends_at follows the same table", () => {
    expect(penangguhanEndsAt({ ...P, newDateIso: "2026-12-05", newTime: "8:45 malam" }, NOW)).toBe(at("2026-12-05T23:45"));
    expect(penangguhanEndsAt({ ...P, newDateIso: "2026-12-05", newTime: "Selepas Maghrib" }, NOW)).toBe(at("2026-12-05T23:59"));
    expect(penangguhanEndsAt(P, NOW)).toBe(at("2026-11-28T23:59"));
    expect(penangguhanEndsAt({ ...P, kind: "batal", newDateIso: "2026-12-05" }, NOW)).toBe(at("2026-11-28T23:59"));
    expect(penangguhanEndsAt({ ...P, dateIso: "2026-11-20" }, NOW)).toBe(NOW + 24 * H);
  });
  it("new date fields are Tangguh-only: hidden from validation and dropped for Batal", () => {
    const batal = { ...P, kind: "batal", newDate: "x", newDateIso: "2026-12-05", newTime: "8:45 malam" };
    expect(cleanPenangguhan(batal)).toEqual({ ...P, kind: "batal" });
    expect(cleanPenangguhan({ ...P, newDateIso: "2026-12-05" })).toMatchObject({ newDateIso: "2026-12-05" });
    expect(validateFields("penangguhan", { ...P })).toEqual({});
    expect(validateFields("penangguhan", { ...P, title: "" })).toMatchObject({ title: { code: "required" } });
    expect(validateFields("penangguhan", { ...P, reason: "a".repeat(101) })).toMatchObject({ reason: { code: "tooLong", max: 100 } });
  });
});
