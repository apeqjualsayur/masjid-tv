// Announcement template field schemas (PRD section 7). Templates render as HTML on the TV,
// never as images. Dates and times are display strings entered by the AJK.
import type { PrayerKey } from "@/core";

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
  | "ucapan";

export const TEMPLATE_KEYS: readonly TemplateKey[] = [
  "pengumuman", "kuliah", "kematian", "program", "infaq",
  "mesyuarat", "imam_bilal", "kewangan", "ayat", "ucapan",
];

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

export interface TemplateFields {
  pengumuman: PengumumanFields;
  kuliah: KuliahFields;
  kematian: KematianFields;
  program: ProgramFields;
  infaq: InfaqFields;
  mesyuarat: MesyuaratFields;
  imam_bilal: ImamBilalFields;
  kewangan: KewanganFields;
  ayat: AyatFields;
  ucapan: UcapanFields;
}

/** What goes in the poster/announcement area of the bottom and side layouts. */
export type SlideView =
  | { kind: "poster"; imageUrl: string }
  | { [K in TemplateKey]: { kind: "template"; template: K; fields: TemplateFields[K] } }[TemplateKey];