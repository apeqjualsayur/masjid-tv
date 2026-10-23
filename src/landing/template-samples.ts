// Landing-only sample content for the template thumbnails (PRD §10: no "[ … ]" placeholders on the
// page). Generic, no real people. Kematian and Ayat are not rendered with content on the landing
// page (a death notice needs a person's name; verses come from the list awaiting review), so they
// use the design's abstract thumbnail instead.
import type { TemplateFields, TemplateKey } from "@/templates";

export const ABSTRACT_THUMBS: Partial<Record<TemplateKey, { bg: string; fg: string }>> = {
  kematian: { bg: "#ECECEC", fg: "#3A3A3A" },
  ayat: { bg: "#F3EEDF", fg: "#6E5A1E" },
};

export const LANDING_SAMPLES: Partial<TemplateFields> = {
  pengumuman: {
    title: "Gotong-royong perdana",
    body: "Semua ahli kariah dijemput membersihkan kawasan masjid. Sarapan disediakan untuk peserta.",
    issuedBy: "Biro Kebajikan",
    validUntil: "Sabtu ini",
  },
  kuliah: {
    series: "Kuliah Maghrib",
    topic: "Adab Menuntut Ilmu",
    speaker: "Penceramah jemputan",
    date: "Setiap Khamis",
    time: "Selepas Maghrib",
    venue: "Dewan solat utama",
  },
  program: {
    title: "Program Keluarga Sakinah",
    description: "Ceramah dan bengkel ringkas untuk pasangan dan ibu bapa.",
    date: "Ahad ini",
    time: "9:00 pagi",
    venue: "Dewan serbaguna",
    organiser: "Biro Dakwah",
    contact: "Pejabat masjid",
  },
  infaq: {
    fundName: "Tabung Pembangunan Masjid",
    purpose: "Menaik taraf ruang solat wanita",
    collected: 32400,
    target: 50000,
    updatedAt: "Minggu ini",
    accountName: "Contoh sahaja",
  },
  mesyuarat: {
    title: "Mesyuarat Agung Tahunan",
    invitation: "Semua ahli kariah dijemput hadir.",
    date: "Ahad ini",
    time: "10:00 pagi",
    venue: "Bilik mesyuarat",
    issuedBy: "Setiausaha AJK",
  },
  imam_bilal: {
    weekRange: "Jadual minggu ini",
    table: [
      { waktu: "subuh", imam: "Imam A", bilal: "Bilal A" },
      { waktu: "zohor", imam: "Imam B", bilal: "Bilal B" },
      { waktu: "asar", imam: "Imam B", bilal: "Bilal C" },
      { waktu: "maghrib", imam: "Imam A", bilal: "Bilal A" },
      { waktu: "isyak", imam: "Imam C", bilal: "Bilal C" },
    ],
  },
  kewangan: {
    weekRange: "Minggu lepas",
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
  ucapan: {
    occasion: "aidilfitri",
    message: "Maaf zahir dan batin",
    from: "AJK Masjid",
  },
};