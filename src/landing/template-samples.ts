// Landing-only sample content for the template mockups (PRD §10: no "[ … ]" placeholders on the
// page). Generic, no real people. This is TV content, so it is Malay on both language pages, as on a
// real screen. Kematian shows no name (a death notice is about a real person) and Ayat shows no verse
// text (the verse list is still awaiting review): their mockups draw the layout with bars instead.
import type { TemplateFields } from "@/templates";

/** Fixed words drawn inside the mockups (labels the TV templates show). */
export const MOCK_TEXT = {
  kematian: "Makluman kematian",
  jenazah: "Solat jenazah selepas Zohor",
  istirja: "إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ",
  ayatRef: "Daripada sumber sahih",
  bersama: "Bersama",
  daripada: "daripada",
  kutipan: "Kutipan",
  belanja: "Belanja",
  baki: "Baki",
  waktu: "Waktu",
  imam: "Imam",
  bilal: "Bilal",
  hari: "Hari",
  hariIni: "Hari ini",
  // Penangguhan (the stamp word the TV shows: src/themes/shared/notice-stamp.tsx)
  ditangguhkan: "DITANGGUHKAN",
  tangguhSeries: "Kuliah Dhuha",
  tangguhTopic: "Adab Bertetangga",
  tangguhOld: "Sabtu ini · 10:45 pagi",
  tangguhNew: "Tarikh baru: Sabtu depan",
  tangguhReason: "Sebab: Penceramah uzur",
  // Hari Kebesaran Islam (a generic count; Ramadan dates are always "jangkaan")
  kebesaran: "Hari Kebesaran Islam",
  kebesaranDays: "27",
  hariLagi: "hari lagi",
  kebesaranEvent: "Awal Ramadan",
  jangkaan: "jangkaan",
} as const;

/** Jadual Imam & Bilal mockup: a few days of the week, today (Rabu) highlighted. Generic names. */
export const LANDING_ROSTER = [
  { hari: "Isnin", imam: "Imam A", bilal: "Bilal A", today: false },
  { hari: "Selasa", imam: "Imam B", bilal: "Bilal B", today: false },
  { hari: "Rabu", imam: "Imam A", bilal: "Bilal C", today: true },
  { hari: "Khamis", imam: "Imam C", bilal: "Bilal A", today: false },
  { hari: "Jumaat", imam: "Imam B", bilal: "Bilal B", today: false },
] as const;

export const LANDING_SAMPLES: Omit<TemplateFields, "kematian" | "ayat" | "imam_bilal" | "penangguhan" | "hari_kebesaran" | "jadual_petugas"> = {
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