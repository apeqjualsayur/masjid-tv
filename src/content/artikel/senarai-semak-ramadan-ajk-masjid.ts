// /artikel/senarai-semak-ramadan-ajk-masjid/ — DRAFT until `npm run publish-article senarai-semak-ramadan-ajk-masjid`. Block shapes: ./types.ts (example: ./contoh-artikel.ts).
// Copy: _specs/72-articles-content.md, Article 2.
// TODO (owner): publish on 10 Jan 2027 (spec). Then link Article 1's "Senarai semak lengkap" to this page.
import type { Article } from "./types";

const article: Article = {
  slug: "senarai-semak-ramadan-ajk-masjid",
  lang: "ms",
  title: "Senarai semak AJK: 10 perkara untuk skrin masjid sepanjang Ramadan",
  seoTitle: "Persediaan Ramadan Masjid: 10 Senarai Semak AJK",
  description: "Jadual tarawih, giliran moreh, tadarus, zakat fitrah dan Nuzul al-Quran: senarai semak AJK untuk memaklumkan jemaah melalui skrin masjid sepanjang Ramadan.",
  datePublished: "2026-11-20",
  dateModified: "2026-11-20",
  summary:
    "Sepanjang Ramadan, jemaah perlu tahu lebih daripada waktu solat: siapa imam tarawih malam ini, giliran moreh, program tadarus, kaunter zakat fitrah dan majlis Nuzul al-Quran. Senarai semak ini membantu AJK menyediakan semua maklumat itu sebelum 1 Ramadan, supaya skrin masjid sentiasa terkini.",
  blocks: [
    { type: "heading", text: "10 perkara untuk disediakan sebelum 1 Ramadan" },
    {
      type: "ordered",
      items: [
        "**Waktu imsak dan berbuka.** Pastikan zon JAKIM masjid betul dan skrin memaparkan waktu Imsak serta Maghrib dengan jelas.",
        "**Jadual imam dan bilal tarawih.** Susun giliran mengikut hari dan paparkan siapa bertugas malam ini.",
        "**Bilangan rakaat dan waktu tarawih.** Nyatakan sama ada 8 atau 20 rakaat, dan jarak masa selepas Isyak.",
        "**Giliran moreh dan iftar.** Senaraikan penaja atau kumpulan kariah mengikut tarikh, dengan ucapan terima kasih.",
        "**Program tadarus.** Masa, tempat dan sasaran khatam.",
        "**Kuliah dan tazkirah Ramadan.** Tajuk, penceramah dan masa, contohnya selepas Subuh atau sebelum tarawih.",
        "**Kutipan zakat fitrah.** Tarikh, masa dan lokasi kaunter amil. Untuk kadar, rujuk pengumuman Majlis Agama Islam negeri anda.",
        "**Majlis Nuzul al-Quran (17 Ramadan).** Program, penceramah dan jamuan.",
        "**Qiamullail 10 malam terakhir.** Jadual, masa mula dan makluman sahur.",
        "**Notis Aidilfitri.** Waktu solat sunat Aidilfitri, takbir raya dan ucapan perayaan.",
      ],
    },
    { type: "heading", text: "Tip paparan untuk jemaah" },
    {
      type: "list",
      items: [
        "**Satu maklumat, satu slaid.** Jemaah membaca skrin dari jauh dan sekejap sahaja; elakkan poster yang padat.",
        "**Jadualkan awal.** Sediakan notis Nuzul al-Quran dan Aidilfitri sekarang, tetapkan tarikh mula dan tamat, dan biarkan skrin memaparkannya pada masa yang betul.",
        "**Jika program berubah, jangan padam slaid.** Tandakan sebagai ditangguhkan atau dibatalkan supaya jemaah nampak perubahan itu.",
        "**Dua TV, dua tugas.** Jika masjid ada dua TV, guna satu untuk waktu solat dan satu lagi untuk pengumuman Ramadan.",
      ],
    },
    { type: "heading", text: "Bagaimana Masjid View membantu" },
    {
      type: "list",
      items: [
        "**Hari Kebesaran Islam:** kira detik ke 1 Ramadan, kemudian “Ramadan · Hari ke-…” dan kiraan hari ke Aidilfitri, tanpa dikemas kini setiap hari.",
        "**Jadual Imam & Bilal:** masukkan petugas sekali, susun mengikut hari (dan ikut waktu jika perlu); skrin menyerlahkan siapa bertugas hari ini.",
        "**Kuliah dan Program dengan kiraan detik:** slaid menunjukkan berapa hari atau minit lagi sebelum program bermula.",
        "**Tangguh / Batal:** jika tazkirah atau majlis berubah, tekan Tangguhkan atau Batalkan; skrin terus memaparkan cop “DITANGGUHKAN” atau “DIBATALKAN” dengan tarikh baharu.",
        "**Templat siap:** Kuliah / Ceramah, Program, Kutipan / Infaq, Ucapan Perayaan dan lain-lain. Isi borang, tekan Terbit.",
      ],
    },
    { type: "cta", links: [{ label: "Cuba demo langsung", href: "/tv/?demo=1" }, { label: "Daftar masjid anda, percuma", href: "/admin/" }] },
    {
      type: "faq",
      items: [
        { q: "Bila AJK patut mula bersedia untuk Ramadan?", a: "Sebaik-baiknya enam hingga lapan minggu sebelum 1 Ramadan, iaitu sekitar pertengahan Disember 2026 untuk Ramadan 1448H." },
        { q: "Perlukah poster direka sendiri?", a: "Tidak. Templat Masjid View dijana daripada maklumat yang diisi, dalam saiz yang tepat untuk skrin." },
        { q: "Bagaimana jika tazkirah ditangguhkan saat akhir?", a: "Tandakan slaid sebagai ditangguhkan dari telefon; skrin masjid dikemas kini dalam masa kira-kira seminit." },
      ],
    },
  ],
  related: ["ramadan-2027-tarikh-jangkaan", "cara-pasang-skrin-waktu-solat-tv-masjid"],
  draft: true,
};

export default article;
