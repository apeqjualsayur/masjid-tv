// Announcement template field schemas (PRD section 7). Templates render as HTML on the TV,
// never as images. Dates and times are display strings entered by the AJK.
import type { PrayerKey, TemplateLive } from "@/core";

export type { TemplateLive };

export type TemplateKey =
  | "pengumuman"
  | "kuliah"
  | "kematian"
  | "program"
  | "infaq"
  | "mesyuarat"
  | "imam_bilal"
  | "kewangan"
  | "ayat"
  | "ucapan"
  | "penangguhan"
  | "hari_kebesaran"
  | "jadual_petugas";

export const TEMPLATE_KEYS: readonly TemplateKey[] = [
  "pengumuman", "kuliah", "kematian", "program", "infaq",
  "mesyuarat", "imam_bilal", "kewangan", "ayat", "ucapan",
  "penangguhan", "hari_kebesaran", "jadual_petugas",
];

/**
 * Not offered in the admin template picker (they still render and stay editable). jadual_petugas:
 * until its editor (live roster preview) ships in E15, when imam_bilal is hidden instead (PRD D9).
 */
export const PICKER_HIDDEN: readonly TemplateKey[] = ["jadual_petugas"];

/** A ?key= value (or a slides.template_key) as one of the template keys, or null when it is not one. */
export function resolveTemplateKey(k: string | null | undefined): TemplateKey | null {
  return k && (TEMPLATE_KEYS as readonly string[]).includes(k) ? (k as TemplateKey) : null;
}

export interface PengumumanFields {
  title: string;
  body: string;
  issuedBy: string;
  validUntil: string;
}

export interface KuliahFields {
  /** e.g. "Kuliah Maghrib" */
  series: string;
  topic: string;
  speaker: string;
  date: string;
  time: string;
  venue: string;
  speakerPhoto?: string;
}

/** Sober styling, no decoration, in every theme. */
export interface KematianFields {
  name: string;
  age?: number;
  address: string;
  solatJenazah: { time: string; place: string };
  burialPlace: string;
}

export interface ProgramFields {
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  organiser: string;
  contact: string;
}

export interface InfaqFields {
  fundName: string;
  purpose: string;
  /** RM */
  collected: number;
  /** RM */
  target: number;
  updatedAt: string;
  qrImage?: string;
  accountName: string;
}

export interface MesyuaratFields {
  title: string;
  invitation: string;
  date: string;
  time: string;
  venue: string;
  issuedBy: string;
}

export interface ImamBilalFields {
  weekRange: string;
  /** One row per prayer, 5 rows. */
  table: { waktu: PrayerKey; imam: string; bilal: string }[];
}

export interface MoneyLine {
  label: string;
  /** RM, positive */
  amount: number;
}

export interface KewanganFields {
  weekRange: string;
  income: MoneyLine[];
  expense: MoneyLine[];
  /** RM */
  balance: number;
}

/** Translations must come from an approved source, never free text (PRD section 7). */
export const APPROVED_TRANSLATION_SOURCES = {
  "jakim-pimpinan-ar-rahman": "Tafsir Pimpinan Ar-Rahman (JAKIM)",
  /** Entries in ayat-sources.json until an ustaz replaces them with the approved text (shown honestly on the TV). */
  "draf-belum-disemak": "Terjemahan draf, belum disemak",
} as const;
export type ApprovedSourceId = keyof typeof APPROVED_TRANSLATION_SOURCES;

export interface AyatFields {
  arabic: string;
  translation: string;
  /** e.g. "Surah Al-Baqarah 2:153" */
  reference: string;
  source: ApprovedSourceId;
}

export type UcapanOccasion = "aidilfitri" | "aidiladha" | "maal_hijrah" | "maulidur_rasul";

export interface UcapanFields {
  occasion: UcapanOccasion;
  message: string;
  from: string;
}

/** fields.notice on kuliah / program / mesyuarat (PRD enhancements §3.1). */
export interface ActivityNoticeFields {
  kind: "tangguh" | "batal";
  /** "2026-11-28T20:45" (Malaysia time); null = "Tarikh baru akan dimaklumkan". Tangguh only. */
  newAt?: string | null;
  reason?: string | null;
  setAt?: string;
  prevPriority?: boolean;
}

/** Event time fields shared by kuliah / program / mesyuarat (PRD enhancements §4.1). */
export interface ActivityExtras {
  /** "YYYY-MM-DD", written by the editor next to the display `date`. */
  dateIso?: string;
  /** Missing counts as on. */
  showCountdown?: boolean;
  /** How long "Sedang berlangsung" shows; default 90. */
  durationMin?: number;
  notice?: ActivityNoticeFields;
}

/** Standalone notice for an activity that was never a slide (PRD enhancements §3.5). */
export interface PenangguhanFields {
  /** Tajuk aktiviti, ≤ 80 */
  title: string;
  kind: "tangguh" | "batal";
  /** Original date (display + ISO) and time */
  date: string;
  dateIso?: string;
  time: string;
  /** New date and time (Tangguh only, optional) */
  newDate?: string;
  newDateIso?: string;
  newTime?: string;
  /** Penceramah / penganjur, ≤ 60 */
  person?: string;
  /** ≤ 100 */
  reason?: string;
  /** ≤ 140 */
  note?: string;
}

/** Hari kebesaran Islam slide (PRD enhancements §5.3). Dates come from the platform takwim, never the slide. */
export interface HariKebesaranFields {
  /** Event keys to include; missing = all 9. */
  events?: string[];
  /** Start showing an event this many days before (7–365, default 60). */
  leadDays?: number;
  /** Following events shown small (0–2, default 2). */
  showMore?: number;
}

/** Jadual Imam & Bilal slide (PRD enhancements §6.3). The names come from the masjid's roster (Petugas). */
export interface JadualPetugasFields {
  /** minggu (default) = the week; hari_ini = today's 5 waktu + tomorrow */
  view?: "minggu" | "hari_ini";
  /** Default "Jadual Imam & Bilal", ≤ 40 */
  title?: string;
}

export interface TemplateFields {
  pengumuman: PengumumanFields;
  kuliah: KuliahFields & ActivityExtras;
  kematian: KematianFields;
  program: ProgramFields & ActivityExtras;
  infaq: InfaqFields;
  mesyuarat: MesyuaratFields & ActivityExtras;
  imam_bilal: ImamBilalFields;
  kewangan: KewanganFields;
  ayat: AyatFields;
  ucapan: UcapanFields;
  penangguhan: PenangguhanFields;
  hari_kebesaran: HariKebesaranFields;
  jadual_petugas: JadualPetugasFields;
}

/**
 * What goes in the poster/announcement area of the bottom and side layouts. `live` (contract rule 21)
 * is attached by the TV for the slide on screen, at that second.
 */
export type SlideView =
  | { kind: "poster"; imageUrl: string }
  | { [K in TemplateKey]: { kind: "template"; template: K; fields: TemplateFields[K]; live?: TemplateLive } }[TemplateKey];