// /artikel/ramadan-2027-tarikh-jangkaan/ — published. Block shapes: ./types.ts.
// Copy: _specs/72-articles-content.md, Article 1. Ramadan dates are jangkaan until the official announcement.
import type { Article } from "./types";

const article: Article = {
  slug: "ramadan-2027-tarikh-jangkaan",
  lang: "ms",
  title: "Bila Ramadan 2027 bermula? Tarikh jangkaan 1 Ramadan 1448H",
  seoTitle: "Bila Ramadan 2027 Bermula? Tarikh Jangkaan 1 Ramadan 1448H",
  description: "1 Ramadan 1448H dijangka jatuh pada Isnin, 8 Februari 2027. Semak tarikh penting Ramadan dan Aidilfitri 2027 serta persediaan masjid dan surau.",
  datePublished: "2026-11-20",
  dateModified: "2026-11-20",
  summary:
    "1 Ramadan 1448H di Malaysia dijangka jatuh pada Isnin, 8 Februari 2027, dengan solat tarawih pertama pada malam Ahad, 7 Februari. Tarikh rasmi hanya muktamad selepas pengisytiharan Penyimpan Mohor Besar Raja-Raja pada petang 29 Syaaban, berdasarkan kaedah rukyah dan hisab.",
  blocks: [
    { type: "heading", text: "Tarikh penting Ramadan 2027 (jangkaan)" },
    {
      type: "table",
      head: ["Peristiwa", "Tarikh jangkaan"],
      rows: [
        ["Melihat anak bulan Ramadan (29 Syaaban)", "Ahad, 7 Februari 2027 (petang)"],
        ["Malam tarawih pertama", "Ahad, 7 Februari 2027"],
        ["1 Ramadan 1448H, mula berpuasa", "Isnin, 8 Februari 2027"],
        ["Nuzul al-Quran (17 Ramadan)", "Rabu, 24 Februari 2027"],
        ["10 malam terakhir bermula", "sekitar 27–28 Februari 2027"],
        ["Hari Raya Aidilfitri (1 Syawal)", "Selasa 9 atau Rabu 10 Mac 2027"],
      ],
    },
    { type: "callout", text: "Semua tarikh adalah jangkaan berdasarkan kiraan falak dan boleh berubah. Rujuk pengumuman rasmi." },
    { type: "heading", text: "Bagaimana tarikh awal Ramadan ditentukan di Malaysia?" },
    {
      type: "paragraph",
      text: "Tarikh awal Ramadan ditetapkan berdasarkan rukyah (cerapan anak bulan) dan hisab (kiraan falak), seperti yang dipersetujui Majlis Raja-Raja. Anak bulan dicerap di lokasi-lokasi rasmi di seluruh negara pada petang 29 Syaaban, dan keputusan diumumkan oleh Penyimpan Mohor Besar Raja-Raja melalui radio dan televisyen pada malam yang sama.",
    },
    { type: "heading", text: "Adakah 1 Ramadan cuti umum?" },
    { type: "paragraph", text: "Awal Ramadan ialah cuti umum di beberapa negeri sahaja, termasuk Johor dan Kedah. Semak senarai cuti umum negeri anda untuk 2027." },
    { type: "heading", text: "Apa yang masjid dan surau perlu sediakan?" },
    {
      type: "paragraph",
      // TODO when Article 2 is published: link to /artikel/senarai-semak-ramadan-ajk-masjid/ instead of /artikel/.
      text: "Dua bulan sebelum Ramadan ialah masa terbaik untuk AJK menyusun jadual imam tarawih, giliran moreh, program tadarus dan kutipan zakat fitrah. Senarai semak lengkap: [Senarai semak skrin masjid untuk Ramadan](/artikel/).",
    },
    { type: "heading", text: "Kira detik ke Ramadan di skrin masjid anda" },
    {
      type: "paragraph",
      text: "Masjid View memaparkan waktu solat harian berdasarkan data e-Solat JAKIM untuk zon masjid anda, terus di TV yang sedia ada, percuma. Slaid Hari Kebesaran Islam mengira hari ke Ramadan dan Aidilfitri secara automatik, dan sepanjang Ramadan memaparkan “Ramadan · Hari ke-…”.",
    },
    { type: "cta", links: [{ label: "Lihat demo langsung", href: "/tv/?demo=1" }, { label: "Daftar masjid anda", href: "/admin/" }] },
    {
      type: "faq",
      items: [
        { q: "Bila puasa 2027 bermula?", a: "Dijangka Isnin, 8 Februari 2027, tertakluk kepada pengisytiharan rasmi." },
        { q: "Bila Hari Raya Aidilfitri 2027?", a: "Dijangka Selasa, 9 Mac atau Rabu, 10 Mac 2027, bergantung kepada sama ada Ramadan 29 atau 30 hari." },
        { q: "Berapa hari Ramadan 1448H?", a: "Sama ada 29 atau 30 hari, ditentukan oleh cerapan anak bulan Syawal." },
      ],
    },
  ],
  related: ["senarai-semak-ramadan-ajk-masjid", "cara-pasang-skrin-waktu-solat-tv-masjid"],
};

export default article;
