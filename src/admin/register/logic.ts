// Registration rules (PRD Phase 2 §4.2, schema limits in _specs/11-schema.sql). Pure: no React, no Supabase.
import type { ZoneChoice } from "../ZonePicker/logic";

export type OrgKind = "masjid" | "surau";

export interface RegisterForm {
  kind: OrgKind;
  fullName: string;
  shortName: string;
  zone: ZoneChoice | null;
  address: string;
  phone: string;
}

export const LIMITS = { fullNameMin: 3, fullNameMax: 120, shortNameMax: 40, addressMax: 300, phoneMax: 20, phoneDigitsMin: 9, phoneDigitsMax: 15 } as const;

export type FieldKey = "fullName" | "shortName" | "zone" | "address" | "phone";
/** i18n key per invalid field (register.err.*). */
export type FieldErrors = Partial<Record<FieldKey, string>>;

const len = (s: string) => [...s.trim()].length;

export function validateRegistration(f: RegisterForm): FieldErrors {
  const e: FieldErrors = {};
  const full = len(f.fullName);
  if (full === 0) e.fullName = "register.err.fullNameRequired";
  else if (full < LIMITS.fullNameMin || full > LIMITS.fullNameMax) e.fullName = "register.err.fullNameLength";
  const short = len(f.shortName);
  if (short === 0) e.shortName = "register.err.shortNameRequired";
  else if (short > LIMITS.shortNameMax) e.shortName = "register.err.shortNameLength";
  if (!f.zone) e.zone = "register.err.zoneRequired";
  if (len(f.address) > LIMITS.addressMax) e.address = "register.err.addressLength";
  const phone = f.phone.trim();
  const digits = phone.replace(/\D/g, "").length;
  if (!phone) e.phone = "register.err.phoneRequired";
  else if (phone.length > LIMITS.phoneMax || !/^\+?[\d\s()-]+$/.test(phone) || digits < LIMITS.phoneDigitsMin || digits > LIMITS.phoneDigitsMax) e.phone = "register.err.phoneInvalid";
  return e;
}

/** Arguments for public.register_org(...), trimmed; empty optional fields become null. */
export function registerArgs(f: RegisterForm & { zone: ZoneChoice }) {
  return {
    p_kind: f.kind,
    p_full_name: f.fullName.trim(),
    p_short_name: f.shortName.trim(),
    p_state: f.zone.state,
    p_district: f.zone.district,
    p_zone: f.zone.zone,
    p_address: f.address.trim() || null,
    p_phone: f.phone.trim().replace(/\s+/g, " ") || null,
  };
}

/** Friendly message key for an error from register_org / storage / network. */
export function errorKeyOf(err: unknown): string {
  const e = (err ?? {}) as { message?: string; code?: string; name?: string };
  const msg = `${e.message ?? ""}`;
  if (msg.includes("too_many_pending")) return "register.err.tooManyPending";
  if (msg.includes("not_authenticated") || e.code === "28000" || /jwt/i.test(msg)) return "register.err.signedOut";
  if (e.code === "23514" || e.code === "22001" || e.code === "23502") return "register.err.invalid";
  if (e.name === "TypeError" || /failed to fetch|network|load failed/i.test(msg)) return "register.err.network";
  return "register.err.generic";
}

/** Largest size within max x max keeping the aspect ratio; never enlarges. */
export function fitWithin(width: number, height: number, max = 512): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 1, height: 1 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export interface LogoFile {
  blob: Blob;
  width: number;
  height: number;
  /** "webp", or "png" on a browser that cannot encode WebP. */
  ext: "webp" | "png";
}

/** Everything registration needs from Supabase; an interface so the order can be tested. */
export interface RegisterBackend {
  registerOrg(args: ReturnType<typeof registerArgs>): Promise<string>;
  uploadObject(path: string, blob: Blob, contentType: string): Promise<void>;
  insertMedia(row: { org_id: string; path: string; kind: "logo"; width: number; height: number; bytes: number }): Promise<void>;
  setOrgLogo(orgId: string, path: string | null): Promise<void>;
  deleteMedia(path: string): Promise<void>;
  removeObject(path: string): Promise<void>;
}

export type LogoOutcome = "none" | "ok" | "failed";

/**
 * register_org first (the org must exist before its folder can be written), then the logo:
 * upload to media/{org_id}/{uuid}.webp → media row (kind 'logo') → set_org_logo. A logo failure never
 * undoes the registration; the row and file are removed again if the logo could not be set.
 */
export async function submitRegistration(
  backend: RegisterBackend,
  form: RegisterForm & { zone: ZoneChoice },
  logo: LogoFile | null,
  newId: () => string,
): Promise<{ orgId: string; logo: LogoOutcome }> {
  const orgId = await backend.registerOrg(registerArgs(form));
  if (!logo) return { orgId, logo: "none" };
  const path = `${orgId}/${newId()}.${logo.ext}`;
  try {
    await backend.uploadObject(path, logo.blob, logo.ext === "webp" ? "image/webp" : "image/png");
  } catch {
    return { orgId, logo: "failed" };
  }
  try {
    await backend.insertMedia({ org_id: orgId, path, kind: "logo", width: logo.width, height: logo.height, bytes: logo.blob.size });
    await backend.setOrgLogo(orgId, path);
    return { orgId, logo: "ok" };
  } catch {
    await backend.deleteMedia(path).catch(() => undefined);
    await backend.removeObject(path).catch(() => undefined);
    return { orgId, logo: "failed" };
  }
}

