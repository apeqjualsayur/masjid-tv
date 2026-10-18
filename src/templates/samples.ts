// One sample per template, placeholder text in brackets (PRD section 7, Phase 1).
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
};

export function sampleSlide(key: TemplateKey): SlideView {
  return { kind: "template", template: key, fields: SAMPLE_FIELDS[key] } as SlideView;
}

export const SAMPLE_POSTER: SlideView = { kind: "poster", imageUrl: "/config/poster-portrait.svg" };
export const SAMPLE_POSTER_LANDSCAPE: SlideView = { kind: "poster", imageUrl: "/config/poster-landscape.svg" };