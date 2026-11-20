// `live` data for templates (_specs/01-theme-contract.md rule 21): computed here from the slide fields
// and the clock, rendered as given by the themes. Pure; BM text.
import { activityNotice, formatClockBm, isDateKey, parseClockBm, slideActivityCountdown, type ActivityCountdown } from "./activity";
import { formatTime } from "./format";
import { localParts, pad2, parseLocalDateTime, weekdayOfDateKey } from "./time";

/** Contract §1 `TemplateLive` (the parts built so far: countdown and notice). */
export interface TemplateLive {
  /** "Lagi 3 hari" (strong "3"), "Bermula dalam 42:15" (strong "42:15") … */
  countdown?: { state: "days" | "tomorrow" | "today" | "minutes" | "ongoing"; text: string; strong?: string };
  /** originalText is drawn struck through; newText null = "Tarikh baru akan dimaklumkan" (tangguh) / nothing (batal). */
  notice?: { kind: "tangguh" | "batal"; originalText: string; newText: string | null; reason: string | null };
}

const HARI = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
const BULAN_PENDEK = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];

/** "2026-11-28" → "Sabtu, 28 Nov" */
export function formatDateShortBm(dateKey: string): string {
  if (!isDateKey(dateKey)) return "";
  const [, m, d] = dateKey.split("-").map(Number);
  return `${HARI[weekdayOfDateKey(dateKey)]}, ${d} ${BULAN_PENDEK[m - 1]}`;
}

/** A clock text as entered ("8:45 malam") in the masjid's 12h/24h setting; other text unchanged. */
export function clockText(text: string, clock24h: boolean): string {
  const hhmm = parseClockBm(text);
  return hhmm && clock24h ? hhmm : text;
}

/** Countdown state → the line a theme shows (contract rule 23). */
export function countdownLive(c: ActivityCountdown): TemplateLive["countdown"] {
  switch (c.kind) {
    case "days":
      return { state: "days", text: `Lagi ${c.days} hari`, strong: String(c.days) };
    case "tomorrow":
      return { state: "tomorrow", text: c.time ? `Esok · ${c.time}` : "Esok", strong: "Esok" };
    case "today":
      return { state: "today", text: c.time ? `Hari ini · ${c.time}` : "Hari ini", strong: "Hari ini" };
    case "minutes":
      return { state: "minutes", text: `Bermula dalam ${c.text}`, strong: c.text };
    case "ongoing":
      return { state: "ongoing", text: "Sedang berlangsung", strong: "Sedang berlangsung" };
    default:
      return undefined;
  }
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const joinDot = (...xs: string[]) => xs.filter(Boolean).join(" · ");

/** The original date/time as the AJK wrote it on the slide ("Sabtu, 28 November 2026 · 8:45 malam"). */
function originalText(fields: Record<string, unknown>, clock24h: boolean): string {
  return joinDot(str(fields.date), clockText(str(fields.time), clock24h));
}

/** A notice's newAt ("2026-12-05T20:45") → "Sabtu, 5 Dis · 8:45 malam" (24h: "· 20:45"). */
function newAtText(newAt: string, clock24h: boolean): string | null {
  const ms = parseLocalDateTime(newAt);
  if (ms === null) return null;
  const p = localParts(ms);
  const key = `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
  const time = clock24h ? formatTime(ms, true) : formatClockBm(`${pad2(p.hour)}:${pad2(p.minute)}`);
  return joinDot(formatDateShortBm(key), time);
}

/** kuliah / program / mesyuarat: countdown line and, when set, the notice (§3.4, §4.2). */
export function activityLive(fields: Record<string, unknown>, now: number, clock24h = false): TemplateLive {
  const out: TemplateLive = {};
  const cd = countdownLive(slideActivityCountdown(fields, now, clock24h));
  if (cd) out.countdown = cd;
  const n = activityNotice(fields);
  if (n) {
    out.notice = {
      kind: n.kind,
      originalText: originalText(fields, clock24h),
      newText: n.kind === "tangguh" && n.newAt ? newAtText(n.newAt, clock24h) : null,
      reason: n.reason,
    };
  }
  return out;
}

/**
 * penangguhan (§3.5): always a notice, from its own fields. The new date may have a prayer-relative
 * time ("Selepas Maghrib"), shown as written. No countdown on this template.
 */
export function penangguhanLive(fields: Record<string, unknown>, clock24h = false): TemplateLive {
  const kind = fields.kind === "batal" ? "batal" : "tangguh";
  let newText: string | null = null;
  if (kind === "tangguh" && isDateKey(fields.newDateIso)) {
    newText = joinDot(formatDateShortBm(fields.newDateIso), clockText(str(fields.newTime), clock24h));
  }
  return { notice: { kind, originalText: originalText(fields, clock24h), newText, reason: str(fields.reason) || null } };
}

/** `live` for a template slide at `now`, or undefined when the template has none. */
export function templateLive(templateKey: string, fields: Record<string, unknown>, now: number, clock24h = false): TemplateLive | undefined {
  if (templateKey === "kuliah" || templateKey === "program" || templateKey === "mesyuarat") return activityLive(fields, now, clock24h);
  if (templateKey === "penangguhan") return penangguhanLive(fields, clock24h);
  return undefined;
}
