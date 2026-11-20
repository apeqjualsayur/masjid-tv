// /artikel/cara-pasang-skrin-waktu-solat-tv-masjid/ — published. Block shapes: ./types.ts.
// Copy: _specs/72-articles-content.md, Article 3.
import type { Article } from "./types";

const article: Article = {
  slug: "cara-pasang-skrin-waktu-solat-tv-masjid",
  lang: "ms",
  title: "Cara pasang skrin waktu solat di TV masjid atau surau",
  seoTitle: "Cara Pasang Skrin Waktu Solat di TV Masjid & Surau",
  description: "Panduan langkah demi langkah memasang skrin waktu solat dan pengumuman di TV masjid atau surau, dengan TV Android, kotak Android TV atau komputer riba.",
  datePublished: "2026-11-20",
  dateModified: "2026-11-20",
  summary:
    "Mana-mana TV yang boleh membuka pelayar web boleh menjadi skrin waktu solat masjid. Buka masjidview.my/tv di TV, atau pasang aplikasi Masjid View TV pada Android TV, kemudian pasangkan skrin dengan akaun masjid menggunakan kod 6 digit. Waktu solat terus berjalan walaupun internet terputus.",
  blocks: [
    { type: "heading", text: "Apa yang anda perlukan" },
    {
      type: "list",
      items: [
        "Satu TV: TV pintar Android / Google TV, **atau** TV biasa dengan kotak Android TV, **atau** komputer riba dengan kabel HDMI",
        "WiFi untuk persediaan dan kemas kini pengumuman",
        "Akaun Masjid View yang telah diluluskan (percuma)",
        "Lebih kurang 30 minit",
      ],
    },
    { type: "heading", text: "Langkah 1: Daftar masjid anda" },
    { type: "paragraph", text: "Daftar di [masjidview.my/admin](/admin/) dengan akaun Google. Isikan nama masjid dan pilih zon JAKIM. Akaun akan disemak dan diluluskan." },
    { type: "heading", text: "Langkah 2: Sediakan TV (pilih satu)" },
    {
      type: "list",
      items: [
        "**Android TV / Google TV, aplikasi Masjid View TV (disyorkan):** di Play Store, pasang aplikasi **Downloader**, benarkan ia memasang aplikasi tidak dikenali, taip masjidview.my/apk, pasang dan buka Masjid View TV. Aplikasi ini memastikan skrin sentiasa hidup dan menerima kemas kini sendiri.",
        "**Android TV dengan pelayar kiosk:** pasang Fully Kiosk Browser, tetapkan halaman mula https://masjidview.my/tv, hidupkan “mula semasa but” dan “skrin sentiasa hidup”.",
        "**TV biasa + kotak Android TV:** sambungkan kotak ke TV melalui HDMI, kemudian ikut salah satu cara di atas.",
        "**Komputer riba:** sambungkan ke TV melalui HDMI, buka Chrome di masjidview.my/tv dan tekan F11 untuk skrin penuh.",
      ],
    },
    { type: "heading", text: "Langkah 3: Pasangkan skrin dengan kod 6 digit" },
    { type: "paragraph", text: "TV memaparkan kod 6 digit. Di panel admin (telefon atau komputer), buka Skrin → **Tambah skrin** dan masukkan kod tersebut. Skrin terus memaparkan nama, logo dan waktu solat masjid anda." },
    { type: "heading", text: "Langkah 4: Pilih tema dan susun atur" },
    { type: "paragraph", text: "Pilih satu daripada tujuh tema dan susun atur: waktu solat penuh, atau waktu solat di bawah / tepi dengan ruang pengumuman. Masjid dengan dua TV boleh menjadikan satu TV khas untuk pengumuman." },
    { type: "heading", text: "Langkah 5: Terbitkan pengumuman pertama" },
    { type: "paragraph", text: "Pilih templat (contohnya Kuliah / Ceramah), isi maklumat, semak pratonton dan tekan **Terbit**." },
    { type: "heading", text: "Jika ada masalah" },
    {
      type: "table",
      head: ["Masalah", "Penyelesaian"],
      rows: [
        ["Waktu solat salah", "Semak zon JAKIM dalam tetapan masjid, dan pastikan zon waktu peranti ialah Malaysia (GMT+8)"],
        ["Skrin tidur atau gelap", "Guna aplikasi Masjid View TV, atau matikan mod tidur dalam tetapan TV / pelayar kiosk"],
        ["Internet terputus", "Waktu solat terus berjalan; pengumuman baharu muncul semula apabila sambungan pulih"],
        ["TV tidak buka Masjid View selepas dihidupkan", "Dalam aplikasi: Tetapan → Buka automatik semasa TV dihidupkan; dalam Fully Kiosk: hidupkan “mula semasa but”"],
      ],
    },
    { type: "paragraph", text: "Panduan penuh: [Panduan pemasangan TV](/panduan/)." },
    {
      type: "faq",
      items: [
        { q: "Bolehkah guna TV lama?", a: "Ya, dengan menyambungkan kotak Android TV atau komputer riba melalui HDMI." },
        { q: "Perlukah internet sepanjang masa?", a: "Tidak. Internet diperlukan untuk kemas kini pengumuman; waktu solat disimpan di TV." },
        { q: "Bolehkah satu masjid guna lebih daripada satu TV?", a: "Ya. Setiap skrin ada kod sendiri dan boleh guna tema serta susun atur berbeza." },
        { q: "Berapa kosnya?", a: "Masjid View percuma untuk masjid dan surau. Kos hanya pada TV atau kotak Android TV jika belum ada." },
      ],
    },
  ],
  related: ["senarai-semak-ramadan-ajk-masjid"],
};

export default article;
