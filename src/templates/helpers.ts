// Presentation-neutral helpers for template data (no styling).
import type { InfaqFields, KewanganFields, TemplateKey, UcapanOccasion } from "./types";

/** 3250.5 to "RM 3,250.50" */
export function formatRinggit(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const [whole, cents] = Math.abs(amount).toFixed(2).split(".");
  return `${sign}RM ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`;
}

export function kewanganTotals(f: KewanganFields): { income: number; expense: number } {
  const sum = (xs: { amount: number }[]) => xs.reduce((a, x) => a + (Number.isFinite(x.amount) ? x.amount : 0), 0);
  return { income: sum(f.income), expense: sum(f.expense) };
}

/** 0..1, clamped. 0 if the target is not set. */
export function infaqProgress(f: Pick<InfaqFields, "collected" | "target">): number {
  if (!(f.target > 0) || !Number.isFinite(f.collected)) return 0;
  return Math.min(1, Math.max(0, f.collected / f.target));
}

export const OCCASION_LABEL: Record<UcapanOccasion, string> = {
  aidilfitri: "Selamat Hari Raya Aidilfitri",
  aidiladha: "Selamat Hari Raya Aidiladha",
  maal_hijrah: "Salam Maal Hijrah",
  maulidur_rasul: "Salam Maulidur Rasul",
};

/** A one-line title for lists in the admin app ("Kuliah Maghrib: [Tajuk]"). Empty string if nothing usable. */
export function slideTitle(templateKey: TemplateKey | "poster" | null, fields: Record<string, unknown>): string {
  const s = (k: string) => (typeof fields[k] === "string" ? (fields[k] as string).trim() : "");
  switch (templateKey) {
    case "kuliah":
      return [s("series"), s("topic")].filter(Boolean).join(": ");
    case "kematian":
      return s("name");
    case "infaq":
      return s("fundName");
    case "imam_bilal":
    case "kewangan":
      return s("weekRange");
    case "ayat":
      return s("reference");
    case "ucapan":
      return typeof fields.occasion === "string" && fields.occasion in OCCASION_LABEL
        ? OCCASION_LABEL[fields.occasion as UcapanOccasion]
        : s("message");
    default:
      return s("title");
  }
}
