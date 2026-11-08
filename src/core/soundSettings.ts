// A screen's sound settings (_specs/50-PRD-sound.md D3, D4, D8). Pure: parsing and debug overrides.
// Anything missing or invalid falls back to the defaults, which are OFF.

export const SOUND_KINDS = ["off", "beep", "chime", "alarm", "hayya"] as const;
export type SoundKind = (typeof SOUND_KINDS)[number];

export interface SoundSettings {
  enabled: boolean;
  /** 0–100 */
  volume: number;
  azan: SoundKind;
  iqamah: SoundKind;
}

export const DEFAULT_SOUND: SoundSettings = { enabled: false, volume: 70, azan: "chime", iqamah: "hayya" };

export const isSoundKind = (v: unknown): v is SoundKind => typeof v === "string" && (SOUND_KINDS as readonly string[]).includes(v);

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** 0–100, rounded; anything else → null. */
export function soundVolume(v: unknown): number | null {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : null;
}

/** screen.json `sound`, or (later) the bundle's `screen.sound`: field by field, defaults for the rest. */
export function parseSoundSettings(raw: unknown): SoundSettings {
  const r = isObj(raw) ? raw : {};
  return {
    enabled: r.enabled === true,
    volume: soundVolume(r.volume) ?? DEFAULT_SOUND.volume,
    azan: isSoundKind(r.azan) ? r.azan : DEFAULT_SOUND.azan,
    iqamah: isSoundKind(r.iqamah) ? r.iqamah : DEFAULT_SOUND.iqamah,
  };
}

/** Debug params (sound=1, soundAzan=, soundIqamah=, vol=, mute=1). */
export interface SoundOverrides {
  enabled?: boolean;
  volume?: number;
  azan?: SoundKind;
  iqamah?: SoundKind;
  /** mute=1: off, whatever else says on. */
  mute?: boolean;
}

export function applySoundOverrides(base: SoundSettings, o: SoundOverrides | undefined): SoundSettings {
  if (!o) return base;
  const out: SoundSettings = {
    enabled: o.enabled ?? base.enabled,
    volume: o.volume ?? base.volume,
    azan: o.azan ?? base.azan,
    iqamah: o.iqamah ?? base.iqamah,
  };
  if (o.mute) out.enabled = false;
  return out;
}
