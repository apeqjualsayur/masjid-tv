// Landing copy in BM (ms.json, from the design) and English (en.json). Tiny helper, no dependency.
import en from "./i18n/en.json";
import ms from "./i18n/ms.json";

export type Lang = "ms" | "en";
export type Copy = typeof ms;

const COPY: Record<Lang, Copy> = { ms, en };

/** The whole copy object, for lists (features, FAQ, steps…). */
export const copy = (lang: Lang): Copy => COPY[lang];

/** One string by dotted key ("hero.title"). Missing key → the key itself, so it shows up in review. */
export function t(lang: Lang, key: string): string {
  const v = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), COPY[lang]);
  return typeof v === "string" ? v : key;
}

/** Page addresses per language (static export, trailing slashes). */
export const homeHref = (lang: Lang) => (lang === "en" ? "/en/" : "/");