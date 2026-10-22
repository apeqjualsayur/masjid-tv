// Tetapan rules (PRD Phase 2 §4.6, designs/admin/Settings). Pure: no React, no Supabase.
import type { LogoFile, RegisterBackend } from "../register/logic";

/** The 5 accent colours of the design, with their i18n key. */
export const SWATCHES = [
  { color: "#146C4A", key: "green" },
  { color: "#1F4E8A", key: "blue" },
  { color: "#8A5300", key: "gold" },
  { color: "#5B3D8F", key: "purple" },
  { color: "#8A2A4A", key: "maroon" },
] as const;

export const IQAMAH_KEYS = ["subuh", "zohor", "asar", "maghrib", "isyak"] as const;
export type IqamahKey = (typeof IQAMAH_KEYS)[number];
export type IqamahMin = Record<IqamahKey, number>;
export const IQAMAH = { min: 1, max: 30 } as const;
export const KHUTBAH = { min: 10, max: 90, step: 5 } as const;
export const TICKER = { lines: 5, chars: 140 } as const;

export interface Durations {
  preAzanMin: number;
  azanMin: number;
  solatMin: number;
  khutbahMin: number;
}

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

/** Settings row from the database, with defaults for anything missing or out of range. */
export function readIqamah(raw: unknown): IqamahMin {
  const r = (raw ?? {}) as Partial<Record<IqamahKey, unknown>>;
  const d: IqamahMin = { subuh: 10, zohor: 10, asar: 10, maghrib: 7, isyak: 10 };
  for (const k of IQAMAH_KEYS) if (typeof r[k] === "number") d[k] = clamp(r[k] as number, IQAMAH.min, IQAMAH.max);
  return d;
}

export function readDurations(raw: unknown): Durations {
  const r = (raw ?? {}) as Partial<Record<keyof Durations, unknown>>;
  const d: Durations = { preAzanMin: 5, azanMin: 3, solatMin: 12, khutbahMin: 40 };
  for (const k of Object.keys(d) as (keyof Durations)[]) if (typeof r[k] === "number") d[k] = r[k] as number;
  return d;
}

export function stepIqamah(v: IqamahMin, key: IqamahKey, delta: number): IqamahMin {
  return { ...v, [key]: clamp(v[key] + delta, IQAMAH.min, IQAMAH.max) };
}

export function stepKhutbah(d: Durations, delta: number): Durations {
  return { ...d, khutbahMin: clamp(d.khutbahMin + delta * KHUTBAH.step, KHUTBAH.min, KHUTBAH.max) };
}

/** Lines to save: trimmed, empty ones dropped. Null error key when valid. */
export function cleanTicker(lines: string[]): { lines: string[]; error: string | null } {
  const out = lines.map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (out.length > TICKER.lines) return { lines: out, error: "settings.err.tickerLines" };
  if (out.some((l) => [...l].length > TICKER.chars)) return { lines: out, error: "settings.err.tickerLength" };
  return { lines: out, error: null };
}

export const sameLines = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export type LogoBackend = Pick<RegisterBackend, "uploadObject" | "insertMedia" | "setOrgLogo" | "deleteMedia" | "removeObject">;

/** Deletes a logo's media row and file. Best effort: false if either step failed. */
async function dropLogo(b: LogoBackend, path: string): Promise<boolean> {
  const row = await b.deleteMedia(path).then(() => true, () => false);
  const file = await b.removeObject(path).then(() => true, () => false);
  return row && file;
}

/**
 * New logo: upload → media row → set_org_logo, then delete the old row + file.
 * If any step before set_org_logo fails, the new file is cleaned up and the error is thrown;
 * the old logo stays. Deleting the old file is best effort (reported, never thrown).
 */
export async function replaceLogo(
  b: LogoBackend,
  orgId: string,
  logo: LogoFile,
  oldPath: string | null,
  newId: () => string,
): Promise<{ path: string; oldRemoved: boolean }> {
  const path = `${orgId}/${newId()}.${logo.ext}`;
  await b.uploadObject(path, logo.blob, logo.ext === "webp" ? "image/webp" : "image/png");
  try {
    await b.insertMedia({ org_id: orgId, path, kind: "logo", width: logo.width, height: logo.height, bytes: logo.blob.size });
    await b.setOrgLogo(orgId, path);
  } catch (e) {
    await dropLogo(b, path);
    throw e;
  }
  const oldRemoved = oldPath && oldPath !== path ? await dropLogo(b, oldPath) : true;
  return { path, oldRemoved };
}

/** Back to the monogram: clear logo_path first, then delete the old row + file. */
export async function removeLogo(b: LogoBackend, orgId: string, oldPath: string): Promise<{ oldRemoved: boolean }> {
  await b.setOrgLogo(orgId, null);
  return { oldRemoved: await dropLogo(b, oldPath) };
}