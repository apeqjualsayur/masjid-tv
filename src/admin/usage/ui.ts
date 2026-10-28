// Shared classes for the Penggunaan tab (admin tokens; designs/admin/D-Usage.html for layout).
import type { Level } from "./model";

export const card = "flex min-w-0 flex-col gap-3.5 rounded-[18px] bg-adm-card p-4 shadow-[0_1px_3px_rgba(18,38,30,0.08)] lg:p-5";
export const h2 = "text-[16px] font-extrabold";
export const hint = "text-[13px] leading-[1.45] text-adm-muted";
export const fieldLabel = "flex flex-col gap-1.5 text-[13px] font-bold text-[#3A4E45]";
export const input = "h-[46px] w-full rounded-xl border border-adm-line bg-white px-3.5 text-[15px] font-normal text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-green aria-[invalid=true]:border-adm-danger";
export const primaryBtn = "h-[46px] rounded-xl bg-adm-green px-5 text-[14px] font-bold text-white hover:bg-adm-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-50";
export const note = "rounded-xl bg-adm-ground px-3.5 py-3 text-[13px] leading-[1.5] text-adm-muted";

export type Tone = Level | "info" | "grey";

/** Status pill: text + colour (never colour alone). */
export const pill: Record<Tone, string> = {
  ok: "bg-adm-soft text-adm-green-dark",
  warn: "bg-[#FFF1D6] text-[#8A5300]",
  crit: "bg-[#FDECE8] text-adm-danger",
  info: "bg-[#E3EAF4] text-[#3E5C8A]",
  grey: "bg-adm-hair text-adm-muted",
};

/** Solid colour per level (meter stripe, used bar, action dot). */
export const solid: Record<Tone, string> = {
  ok: "bg-adm-ok",
  warn: "bg-[#A8670F]",
  crit: "bg-adm-danger",
  info: "bg-[#3E5C8A]",
  grey: "bg-adm-line",
};

/** Hatched "projected" bar per level. */
export const hatch: Record<Tone, string> = {
  ok: "repeating-linear-gradient(45deg, rgba(19,122,75,.30) 0 4px, rgba(19,122,75,.12) 4px 8px)",
  warn: "repeating-linear-gradient(45deg, rgba(168,103,15,.32) 0 4px, rgba(168,103,15,.12) 4px 8px)",
  crit: "repeating-linear-gradient(45deg, rgba(163,38,15,.32) 0 4px, rgba(163,38,15,.12) 4px 8px)",
  info: "repeating-linear-gradient(45deg, rgba(62,92,138,.30) 0 4px, rgba(62,92,138,.12) 4px 8px)",
  grey: "repeating-linear-gradient(45deg, rgba(81,101,92,.25) 0 4px, rgba(81,101,92,.10) 4px 8px)",
};
