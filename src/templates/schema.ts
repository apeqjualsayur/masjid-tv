// Field metadata + validation for the 10 templates (PRD Phase 2 §4.5). The admin editor builds its
// form from this; nothing is hand-written per template. Presentation-neutral (no React, no CSS).
//
// Why not zod: the editor needs per-field UI metadata (labels in BM/EN, input type, options, table
// columns, image kind) that zod does not carry, so every template would be described twice. One
// small descriptor gives both the form and the validation, with no new dependency.
import { formatGregorian, localToEpoch, waktuName, type PrayerKey } from "@/core";
import ayatSources from "./ayat-sources.json";
import { OCCASION_LABEL } from "./helpers";
import { APPROVED_TRANSLATION_SOURCES } from "./types";
import type { TemplateKey } from "./types";

export type L = { ms: string; en: string };
export type FieldType = "text" | "longtext" | "date" | "time-choice" | "number" | "money" | "image" | "table" | "select";

interface Base {
  /** Path in the fields object; dots for nested values ("solatJenazah.time"). */
  key: string;
  label: L;
  required?: boolean;
  hint?: L;
  placeholder?: L;
}
export interface TextField extends Base { type: "text" | "longtext"; max: number }
/** Stored as a display string at `key` and the ISO date(s) at `${key}Iso` (to edit and to shift weeks). */
export interface DateField extends Base { type: "date"; range?: boolean }
export interface TimeChoiceField extends Base { type: "time-choice" }
export interface NumberField extends Base { type: "number"; min: number; max: number }
export interface MoneyField extends Base { type: "money"; min: number; max: number }
/** Stored as a path in the 'media' bucket ({org_id}/{uuid}.webp); the TV turns it into a URL. */
export interface ImageField extends Base { type: "image"; imageKind: "qr" | "photo"; maxPx: number }
export interface SelectOption { value: string; label: L; detail?: string }
export interface SelectField extends Base { type: "select"; options: SelectOption[] }
export interface TableColumn { key: string; label: L; type: "text" | "money"; max?: number }
export interface TableField extends Base {
  type: "table";
  columns: TableColumn[];
  /** Fixed rows (Imam & Bilal: one per prayer) … */
  fixedRows?: { key: string; value: string }[];
  /** … or dynamic rows (Kewangan). */
  minRows?: number;
  maxRows?: number;
}
export type FieldDef = TextField | DateField | TimeChoiceField | NumberField | MoneyField | ImageField | SelectField | TableField;

export interface TemplateMeta {
  key: TemplateKey;
  code: string;
  name: L;
  desc: L;
  bg: string;
  fg: string;
  fields: FieldDef[];
  /** Kematian: end date required, at most 7 days (DB-enforced), default 3 days. */
  schedule?: { endRequired: true; maxDays: number };
  /** "Duplikasi untuk minggu depan" (+7 days). */
  weekly?: boolean;
}

// ------------------------------------------------------------------ BM display formats (TV text)

const BULAN = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
const isoParts = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
};

/** "2026-10-20" → "Selasa, 20 Oktober 2026" (same words as the TV clock). */
export function formatDateBm(iso: string): string {
  const p = isoParts(iso);
  return p ? formatGregorian(localToEpoch(p.y, p.m, p.d, 12)) : "";
}

/** ["2026-10-20","2026-10-26"] → "20 – 26 Oktober 2026"; across months/years with both names. */
export function formatRangeBm(a: string, b: string): string {
  const p = isoParts(a);
  const q = isoParts(b);
  if (!p || !q) return "";
  if (p.y === q.y && p.m === q.m) return `${p.d} – ${q.d} ${BULAN[q.m - 1]} ${q.y}`;
  if (p.y === q.y) return `${p.d} ${BULAN[p.m - 1]} – ${q.d} ${BULAN[q.m - 1]} ${q.y}`;
  return `${p.d} ${BULAN[p.m - 1]} ${p.y} – ${q.d} ${BULAN[q.m - 1]} ${q.y}`;
}

export const TIME_CHOICES = ["Selepas Subuh", "Selepas Zohor", "Selepas Asar", "Selepas Maghrib", "Selepas Isyak", "Selepas Solat Jumaat"] as const;

/** "20:30" → "8:30 malam" (Malaysian usage). */
export function formatClockBm(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return "";
  const h = Number(m[1]);
  const part = h < 12 ? "pagi" : h < 14 ? "tengah hari" : h < 19 ? "petang" : "malam";
  return `${h % 12 || 12}:${m[2]} ${part}`;
}

export function addDaysIso(iso: string, days: number): string {
  const p = isoParts(iso);
  if (!p) return iso;
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d + days));
  return d.toISOString().slice(0, 10);
}

// ------------------------------------------------------------------ ayat list

export interface AyatEntry { id: string; kind: "ayat" | "hadith"; reference: string; arabic: string; translation: string; source: keyof typeof APPROVED_TRANSLATION_SOURCES }
export const AYAT_SOURCES: readonly AyatEntry[] = (ayatSources as { entries: AyatEntry[] }).entries;
export const AYAT_VERIFIED = !String((ayatSources as { _status?: string })._status ?? "").includes("TO BE VERIFIED");

// ------------------------------------------------------------------ schemas

const T = (ms: string, en: string): L => ({ ms, en });
const PRAYERS: PrayerKey[] = ["subuh", "zohor", "asar", "maghrib", "isyak"];

export const TEMPLATES: Record<TemplateKey, TemplateMeta> = {
  pengumuman: {
    key: "pengumuman", code: "PNG", name: T("Pengumuman Am", "General notice"), desc: T("Tajuk dan teks ringkas", "Title and short text"), bg: "#E6EEF8", fg: "#1F4E8A",
    fields: [
      { key: "title", type: "text", label: T("Tajuk", "Title"), required: true, max: 80 },
      { key: "body", type: "longtext", label: T("Isi pengumuman", "Notice text"), required: true, max: 300 },
      { key: "issuedBy", type: "text", label: T("Daripada", "From"), max: 60, placeholder: T("cth. Biro Dakwah", "e.g. Dakwah bureau") },
      { key: "validUntil", type: "date", label: T("Sah sehingga", "Valid until") },
    ],
  },
  kuliah: {
    key: "kuliah", code: "KUL", name: T("Kuliah / Ceramah", "Lecture / talk"), desc: T("Tajuk, penceramah, masa", "Title, speaker, time"), bg: "#E3F1EA", fg: "#146C4A", weekly: true,
    fields: [
      { key: "series", type: "select", label: T("Siri", "Series"), required: true, options: ["Kuliah Maghrib", "Kuliah Subuh", "Kuliah Dhuha", "Kuliah Jumaat", "Tazkirah", "Ceramah Khas"].map((v) => ({ value: v, label: T(v, v) })) },
      { key: "topic", type: "text", label: T("Tajuk", "Topic"), required: true, max: 90 },
      { key: "speaker", type: "text", label: T("Penceramah", "Speaker"), required: true, max: 60 },
      { key: "date", type: "date", label: T("Tarikh", "Date"), required: true },
      { key: "time", type: "time-choice", label: T("Masa", "Time"), required: true },
      { key: "venue", type: "text", label: T("Tempat", "Venue"), required: true, max: 60, placeholder: T("cth. Dewan Solat Utama", "e.g. Main prayer hall") },
      { key: "speakerPhoto", type: "image", label: T("Foto penceramah (pilihan)", "Speaker photo (optional)"), imageKind: "photo", maxPx: 512 },
    ],
  },
  kematian: {
    key: "kematian", code: "KEM", name: T("Kematian", "Death notice"), desc: T("Solat jenazah, tamat auto", "Funeral prayer, ends automatically"), bg: "#ECECEC", fg: "#3A3A3A",
    schedule: { endRequired: true, maxDays: 7 },
    fields: [
      { key: "name", type: "text", label: T("Nama Allahyarham / Allahyarhamah", "Name of the deceased"), required: true, max: 80 },
      { key: "age", type: "number", label: T("Umur (pilihan)", "Age (optional)"), min: 0, max: 130 },
      { key: "address", type: "text", label: T("Alamat", "Address"), max: 120 },
      { key: "solatJenazah.time", type: "time-choice", label: T("Masa solat jenazah", "Funeral prayer time"), required: true },
      { key: "solatJenazah.place", type: "text", label: T("Tempat solat jenazah", "Funeral prayer place"), required: true, max: 60, placeholder: T("cth. Masjid ini", "e.g. This masjid") },
      { key: "burialPlace", type: "text", label: T("Tanah perkuburan", "Burial place"), required: true, max: 80 },
    ],
  },
  program: {
    key: "program", code: "PRG", name: T("Program", "Programme"), desc: T("Tarikh, tempat, hubungi", "Date, venue, contact"), bg: "#E3F4F4", fg: "#11666A",
    fields: [
      { key: "title", type: "text", label: T("Nama program", "Programme name"), required: true, max: 80 },
      { key: "description", type: "longtext", label: T("Penerangan", "Description"), max: 200 },
      { key: "date", type: "date", label: T("Tarikh", "Date"), required: true },
      { key: "time", type: "time-choice", label: T("Masa", "Time"), required: true },
      { key: "venue", type: "text", label: T("Tempat", "Venue"), required: true, max: 60 },
      { key: "organiser", type: "text", label: T("Penganjur", "Organiser"), max: 60 },
      { key: "contact", type: "text", label: T("Hubungi", "Contact"), max: 40, placeholder: T("cth. Ustaz Ali 012-345 6789", "e.g. Ustaz Ali 012-345 6789") },
    ],
  },
  infaq: {
    key: "infaq", code: "INF", name: T("Kutipan / Infaq", "Collection / infaq"), desc: T("Sasaran, kemajuan, QR", "Target, progress, QR"), bg: "#FFF1D6", fg: "#8A5300",
    fields: [
      { key: "fundName", type: "text", label: T("Nama tabung", "Fund name"), required: true, max: 60 },
      { key: "purpose", type: "text", label: T("Tujuan", "Purpose"), max: 100 },
      { key: "collected", type: "money", label: T("Terkumpul (RM)", "Collected (RM)"), required: true, min: 0, max: 100_000_000 },
      { key: "target", type: "money", label: T("Sasaran (RM)", "Target (RM)"), required: true, min: 1, max: 100_000_000 },
      { key: "updatedAt", type: "date", label: T("Dikemas kini", "Updated on") },
      { key: "accountName", type: "text", label: T("Nama akaun · No. akaun", "Account name · number"), max: 80 },
      { key: "qrImage", type: "image", label: T("Kod QR DuitNow (pilihan)", "DuitNow QR code (optional)"), imageKind: "qr", maxPx: 800 },
    ],
  },
  mesyuarat: {
    key: "mesyuarat", code: "MES", name: T("Mesyuarat", "Meeting"), desc: T("Notis rasmi AJK", "Official committee notice"), bg: "#F7EAE3", fg: "#8A3F14",
    fields: [
      { key: "title", type: "text", label: T("Mesyuarat", "Meeting"), required: true, max: 80, placeholder: T("cth. Mesyuarat Agung Tahunan", "e.g. Annual General Meeting") },
      { key: "invitation", type: "longtext", label: T("Jemputan", "Invitation"), max: 200 },
      { key: "date", type: "date", label: T("Tarikh", "Date"), required: true },
      { key: "time", type: "time-choice", label: T("Masa", "Time"), required: true },
      { key: "venue", type: "text", label: T("Tempat", "Venue"), required: true, max: 60 },
      { key: "issuedBy", type: "text", label: T("Daripada", "From"), max: 60, placeholder: T("cth. Setiausaha", "e.g. Secretary") },
    ],
  },
  imam_bilal: {
    key: "imam_bilal", code: "I&B", name: T("Imam & Bilal", "Imam & Bilal"), desc: T("Jadual mingguan", "Weekly roster"), bg: "#EEE8F7", fg: "#5B3D8F", weekly: true,
    fields: [
      { key: "weekRange", type: "date", range: true, label: T("Minggu", "Week"), required: true },
      {
        key: "table", type: "table", label: T("Jadual", "Roster"), required: true,
        columns: [{ key: "imam", label: T("Imam", "Imam"), type: "text", max: 40 }, { key: "bilal", label: T("Bilal", "Bilal"), type: "text", max: 40 }],
        fixedRows: PRAYERS.map((p) => ({ key: "waktu", value: p })),
      },
    ],
  },
  kewangan: {
    key: "kewangan", code: "RM", name: T("Penyata Kewangan", "Financial statement"), desc: T("Kutipan, belanja, baki", "Income, spending, balance"), bg: "#E8F0E3", fg: "#3E6A1F", weekly: true,
    fields: [
      { key: "weekRange", type: "date", range: true, label: T("Minggu", "Week"), required: true },
      { key: "income", type: "table", label: T("Kutipan", "Income"), required: true, minRows: 1, maxRows: 8, columns: [{ key: "label", label: T("Perkara", "Item"), type: "text", max: 40 }, { key: "amount", label: T("RM", "RM"), type: "money" }] },
      { key: "expense", type: "table", label: T("Perbelanjaan", "Spending"), required: true, minRows: 1, maxRows: 8, columns: [{ key: "label", label: T("Perkara", "Item"), type: "text", max: 40 }, { key: "amount", label: T("RM", "RM"), type: "money" }] },
      { key: "balance", type: "money", label: T("Baki akaun (RM)", "Account balance (RM)"), required: true, min: -100_000_000, max: 100_000_000 },
    ],
  },
  ayat: {
    key: "ayat", code: "AYT", name: T("Ayat / Hadith", "Verse / hadith"), desc: T("Daripada sumber sahih", "From approved sources"), bg: "#F3EEDF", fg: "#6E5A1E",
    fields: [
      { key: "ayatId", type: "select", label: T("Pilih ayat atau hadith", "Choose a verse or hadith"), required: true, options: AYAT_SOURCES.map((a) => ({ value: a.id, label: T(a.reference, a.reference), detail: a.translation })) },
    ],
  },
  ucapan: {
    key: "ucapan", code: "UCP", name: T("Ucapan Perayaan", "Festive greeting"), desc: T("Aidilfitri, Aidiladha…", "Eid, Maal Hijrah…"), bg: "#FBE8EE", fg: "#8A2A4A",
    fields: [
      { key: "occasion", type: "select", label: T("Sempena", "Occasion"), required: true, options: (Object.keys(OCCASION_LABEL) as (keyof typeof OCCASION_LABEL)[]).map((k) => ({ value: k, label: T(OCCASION_LABEL[k], OCCASION_LABEL[k]) })) },
      { key: "message", type: "longtext", label: T("Ucapan", "Message"), required: true, max: 160 },
      { key: "from", type: "text", label: T("Daripada", "From"), max: 60, placeholder: T("cth. AJK Masjid", "e.g. Masjid committee") },
    ],
  },
};

/** Row label of a fixed table row (Imam & Bilal: the prayer name, BM as on the TV). */
export function fixedRowLabel(value: string): string {
  return (PRAYERS as string[]).includes(value) ? waktuName(value as PrayerKey, false).label : value;
}

// ------------------------------------------------------------------ values

export type Fields = Record<string, unknown>;

export function getPath(f: Fields, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Fields)[k] : undefined), f);
}
export function setPath(f: Fields, path: string, value: unknown): Fields {
  const [head, ...rest] = path.split(".");
  if (rest.length === 0) {
    const out = { ...f };
    if (value === undefined) delete out[head];
    else out[head] = value;
    return out;
  }
  const inner = (f[head] && typeof f[head] === "object" ? f[head] : {}) as Fields;
  return { ...f, [head]: setPath(inner, rest.join("."), value) };
}

/** Empty form for a new slide (Imam & Bilal: 5 prayer rows; Kewangan: one row each). */
export function defaultFields(key: TemplateKey): Fields {
  let f: Fields = {};
  for (const d of TEMPLATES[key].fields) {
    if (d.type === "table") f = setPath(f, d.key, d.fixedRows ? d.fixedRows.map((r) => ({ [r.key]: r.value, ...Object.fromEntries(d.columns.map((c) => [c.key, c.type === "money" ? undefined : ""])) })) : [Object.fromEntries(d.columns.map((c) => [c.key, c.type === "money" ? undefined : ""]))]);
    else if (d.type === "select" && d.required && key !== "ayat") f = setPath(f, d.key, d.options[0]?.value);
    else if (d.type === "text" || d.type === "longtext" || d.type === "time-choice") f = setPath(f, d.key, "");
  }
  return f;
}

/** Ayat: the chosen entry fills the fields the TV shows; no free-text translation. */
export function applyAyat(f: Fields, id: string): Fields {
  const a = AYAT_SOURCES.find((x) => x.id === id);
  if (!a) return { ...f, ayatId: id };
  return { ...f, ayatId: a.id, arabic: a.arabic, translation: a.translation, reference: a.reference, source: a.source };
}

export type FieldError = { code: "required" | "tooLong" | "number" | "range" | "option" | "rows" | "ayat"; max?: number; min?: number };
export type FieldErrors = Record<string, FieldError>;

const blank = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");
const len = (v: unknown) => (typeof v === "string" ? [...v.trim()].length : 0);

export function validateFields(key: TemplateKey, f: Fields): FieldErrors {
  const e: FieldErrors = {};
  for (const d of TEMPLATES[key].fields) {
    const v = getPath(f, d.key);
    if (d.type === "table") {
      const rows = Array.isArray(v) ? (v as Fields[]) : [];
      const want = d.fixedRows?.length;
      if ((want !== undefined && rows.length !== want) || (d.minRows !== undefined && rows.length < d.minRows) || (d.maxRows !== undefined && rows.length > d.maxRows)) {
        e[d.key] = { code: "rows", min: d.minRows, max: d.maxRows };
        continue;
      }
      rows.forEach((row, i) =>
        d.columns.forEach((c) => {
          const cv = row[c.key];
          const p = `${d.key}.${i}.${c.key}`;
          if (c.type === "money") {
            if (typeof cv !== "number" || !Number.isFinite(cv)) e[p] = { code: d.required ? "required" : "number" };
            else if (cv < 0) e[p] = { code: "range", min: 0 };
          } else if (d.required && blank(cv)) e[p] = { code: "required" };
          else if (c.max && len(cv) > c.max) e[p] = { code: "tooLong", max: c.max };
        }),
      );
      continue;
    }
    if (blank(v)) {
      if (d.required) e[d.key] = { code: "required" };
      continue;
    }
    switch (d.type) {
      case "text":
      case "longtext":
        if (typeof v !== "string") e[d.key] = { code: "required" };
        else if (len(v) > d.max) e[d.key] = { code: "tooLong", max: d.max };
        break;
      case "number":
      case "money":
        if (typeof v !== "number" || !Number.isFinite(v) || (d.type === "number" && !Number.isInteger(v))) e[d.key] = { code: "number" };
        else if (v < d.min || v > d.max) e[d.key] = { code: "range", min: d.min, max: d.max };
        break;
      case "select":
        if (!d.options.some((o) => o.value === v)) e[d.key] = { code: "option" };
        break;
      default:
        if (typeof v !== "string") e[d.key] = { code: "required" };
    }
  }
  if (key === "ayat" && !e.ayatId) {
    const a = AYAT_SOURCES.find((x) => x.id === f.ayatId);
    if (!a || f.arabic !== a.arabic || f.translation !== a.translation || f.reference !== a.reference || f.source !== a.source) e.ayatId = { code: "ayat" };
  }
  return e;
}

/** Copy for next week: every date (and date range) +7 days, display strings regenerated. */
export function shiftWeek(key: TemplateKey, f: Fields, days = 7): Fields {
  let out = { ...f };
  for (const d of TEMPLATES[key].fields) {
    if (d.type !== "date") continue;
    const iso = getPath(f, `${d.key}Iso`);
    if (d.range && Array.isArray(iso) && iso.length === 2) {
      const [a, b] = (iso as string[]).map((x) => addDaysIso(x, days));
      out = setPath(setPath(out, `${d.key}Iso`, [a, b]), d.key, formatRangeBm(a, b));
    } else if (typeof iso === "string") {
      const a = addDaysIso(iso, days);
      out = setPath(setPath(out, `${d.key}Iso`, a), d.key, formatDateBm(a));
    }
  }
  return out;
}

/** Field keys holding image paths (for the TV URL mapping and media pruning). */
export const IMAGE_FIELD_KEYS: readonly string[] = [...new Set(Object.values(TEMPLATES).flatMap((t) => t.fields.filter((d) => d.type === "image").map((d) => d.key)))];
/** "8:30 malam" → "20:30" (to edit a time this app wrote); null for anything else. */
export function parseClockBm(text: string): string | null {
  const m = /^(\d{1,2}):(\d{2}) (pagi|tengah hari|petang|malam)$/.exec(text.trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3] !== "pagi") h += 12;
  if (m[3] === "tengah hari" && Number(m[1]) === 12) h = 12;
  if (m[3] === "pagi" && Number(m[1]) === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}
