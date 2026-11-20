// One sample per template, placeholder text in brackets (PRD section 7, Phase 1).
import { localDateKey, type IslamicEvent, type Roster } from "@/core";
import type { SlideView, TemplateFields, TemplateKey } from "./types";

export const SAMPLE_FIELDS: TemplateFields = {
  pengumuman: {
    title: "[Tajuk pengumuman]",
    body: "[Isi pengumuman ringkas dalam dua atau tiga baris. Ruang lapang dibiarkan supaya mudah dibaca dari jauh.]",
    issuedBy: "[Biro / AJK]",
    validUntil: "[Tarikh]",
  },
  kuliah: {
    series: "Kuliah Maghrib",
    topic: "[Tajuk kuliah]",
    speaker: "[Nama penceramah]",
    date: "[Hari, tarikh]",
    time: "[Selepas Maghrib]",
    venue: "[Dewan solat utama]",
  },
  kematian: {
    name: "[Nama Allahyarham / Allahyarhamah]",
    age: 72,
    address: "[Alamat]",
    solatJenazah: { time: "[Selepas Zohor]", place: "[Masjid ini]" },
    burialPlace: "[Tanah perkuburan]",
  },
  program: {
    title: "[Nama program]",
    description: "[Penerangan ringkas program dalam satu atau dua baris.]",
    date: "[Tarikh]",
    time: "[Masa]",
    venue: "[Tempat]",
    organiser: "[Penganjur]",
    contact: "[No. telefon]",
  },
  infaq: {
    fundName: "[Tabung pembangunan]",
    purpose: "[Tujuan kutipan dalam satu baris]",
    collected: 48250,
    target: 120000,
    updatedAt: "[Tarikh kemas kini]",
    accountName: "[Nama akaun · No. akaun]",
  },
  mesyuarat: {
    title: "[Mesyuarat Agung Tahunan]",
    invitation: "[Semua ahli kariah dijemput hadir.]",
    date: "[Tarikh]",
    time: "[Masa]",
    venue: "[Bilik mesyuarat]",
    issuedBy: "[Setiausaha]",
  },
  imam_bilal: {
    weekRange: "[Tarikh mula] – [Tarikh akhir]",
    table: [
      { waktu: "subuh", imam: "[Imam]", bilal: "[Bilal]" },
      { waktu: "zohor", imam: "[Imam]", bilal: "[Bilal]" },
      { waktu: "asar", imam: "[Imam]", bilal: "[Bilal]" },
      { waktu: "maghrib", imam: "[Imam]", bilal: "[Bilal]" },
      { waktu: "isyak", imam: "[Imam]", bilal: "[Bilal]" },
    ],
  },
  kewangan: {
    weekRange: "[Tarikh mula] – [Tarikh akhir]",
    income: [
      { label: "Tabung Jumaat", amount: 3250 },
      { label: "Tabung harian", amount: 820.5 },
    ],
    expense: [
      { label: "Bil elektrik & air", amount: 610 },
      { label: "Penyelenggaraan", amount: 450 },
    ],
    balance: 15230.4,
  },
  ayat: {
    arabic: "[نص الآية]",
    translation: "[Terjemahan daripada sumber yang diluluskan]",
    reference: "[Surah, ayat]",
    source: "jakim-pimpinan-ar-rahman",
  },
  ucapan: {
    occasion: "aidilfitri",
    message: "[Maaf zahir dan batin]",
    from: "[AJK Masjid]",
  },
  penangguhan: {
    title: "[Kuliah Maghrib: Tajuk kuliah]",
    kind: "tangguh",
    date: "[Sabtu, 28 November 2026]",
    time: "8:45 malam",
    newDate: "[Sabtu, 5 Disember 2026]",
    newDateIso: "2026-12-05",
    newTime: "8:45 malam",
    person: "[Nama penceramah]",
    reason: "[Penceramah uzur]",
    note: "[Kami mohon maaf atas sebarang kesulitan.]",
  },
  hari_kebesaran: { leadDays: 60, showMore: 2 },
  jadual_petugas: { view: "minggu", title: "Jadual Imam & Bilal" },
};

/**
 * SAMPLE roster for the local display (?local=1, ?slide=jadual_petugas) only: invented names, NOT a
 * real masjid's roster. Rabu (and Ahad) use two very long names, to check shrink-to-fit and the ellipsis;
 * Khamis has an Isyak exception and Jumaat a Zohor (Jumaat) exception (scripts/qa-petugas.mjs).
 */
export const SAMPLE_ROSTER: Roster = {
  petugas: [
    { id: "s-zaki", name: "Ahmad Zaki", title: "Ust.", roles: ["imam"] },
    { id: "s-hafiz", name: "Hafiz Rahman", title: "Hj.", roles: ["imam", "bilal"] },
    { id: "s-rahim", name: "Rahim Osman", title: null, roles: ["bilal"] },
    { id: "s-khairul", name: "Mohd Khairul Anuar bin Abdul Rahman", title: "Tuan Hj.", roles: ["imam"] },
    { id: "s-syafiq", name: "Muhammad Syafiq Amirul Hakim bin Zulkifli", title: null, roles: ["bilal"] },
  ],
  slots: [
    ...[1, 2, 4, 5].flatMap((day) => [
      { day, waktu: null, role: "imam" as const, petugasId: "s-zaki" },
      { day, waktu: null, role: "bilal" as const, petugasId: "s-rahim" },
    ]),
    { day: 3, waktu: null, role: "imam", petugasId: "s-khairul" },
    { day: 3, waktu: null, role: "bilal", petugasId: "s-syafiq" },
    { day: 4, waktu: "isyak", role: "imam", petugasId: "s-hafiz" },
    { day: 5, waktu: "zohor", role: "imam", petugasId: "s-hafiz" },
    { day: 6, waktu: null, role: "imam", petugasId: "s-hafiz" },
    { day: 6, waktu: null, role: "bilal", petugasId: "s-rahim" },
    { day: 7, waktu: null, role: "imam", petugasId: "s-khairul" },
    { day: 7, waktu: null, role: "bilal", petugasId: "s-syafiq" },
  ],
};

/**
 * SAMPLE takwim for the local display (?local=1, ?slide=hari_kebesaran) only: NOT the real takwim (a
 * paired TV uses the platform table) and deliberately compressed, so every state is reachable with
 * ?sim= within 6 weeks of today (scripts/qa-kebesaran.mjs): +3 Israk dan Mikraj (countdown), +5 the
 * eve of Nisfu Syaaban (Esok / Malam ini), +9…+37 Ramadan, +38/+39 Aidilfitri, +41 Aidiladha.
 */
export const SAMPLE_TAKWIM_OFFSETS = { israk_mikraj: 3, nisfu_syaaban: 6, awal_ramadan: 9, nuzul_quran: 25, aidilfitri: 38, hari_arafah: 40, aidiladha: 41 } as const;

export function sampleIslamicEvents(now: number): IslamicEvent[] {
  const day = (n: number) => localDateKey(now + n * 86_400_000);
  const o = SAMPLE_TAKWIM_OFFSETS;
  return [
    { key: "israk_mikraj", hijriYear: 1448, date: day(o.israk_mikraj), status: "rasmi" },
    { key: "nisfu_syaaban", hijriYear: 1448, date: day(o.nisfu_syaaban), status: "rasmi" },
    { key: "awal_ramadan", hijriYear: 1448, date: day(o.awal_ramadan), status: "jangkaan" },
    { key: "nuzul_quran", hijriYear: 1448, date: day(o.nuzul_quran), status: "jangkaan" },
    { key: "aidilfitri", hijriYear: 1448, date: day(o.aidilfitri), status: "jangkaan" },
    { key: "hari_arafah", hijriYear: 1448, date: day(o.hari_arafah), status: "rasmi" },
    { key: "aidiladha", hijriYear: 1448, date: day(o.aidiladha), status: "rasmi" },
  ];
}

export function sampleSlide(key: TemplateKey): SlideView {
  return { kind: "template", template: key, fields: SAMPLE_FIELDS[key] } as SlideView;
}

export const SAMPLE_POSTER: SlideView = { kind: "poster", imageUrl: "/config/poster-portrait.svg" };
export const SAMPLE_POSTER_LANDSCAPE: SlideView = { kind: "poster", imageUrl: "/config/poster-landscape.svg" };