// Sample article showing every block type. A DRAFT: never built, listed, fed or indexed. Keep it as a
// reference for the block shapes; do not publish it.
import type { Article } from "./types";

const article: Article = {
  slug: "contoh-artikel",
  lang: "ms",
  title: "Contoh artikel (draf)",
  seoTitle: "Contoh artikel",
  description: "Artikel contoh yang menunjukkan setiap jenis blok kandungan. Ia kekal sebagai draf dan tidak pernah diterbitkan di laman Masjid View untuk umum.",
  datePublished: "2026-11-20",
  dateModified: "2026-11-20",
  summary:
    "Ini ialah jawapan ringkas contoh. Setiap artikel bermula dengan jawapan langsung kepada soalan pembaca dalam 40 hingga 60 patah perkataan, kemudian butiran di bawahnya. Artikel ini hanya contoh bentuk blok dan tidak akan diterbitkan kepada umum di laman Masjid View.",
  blocks: [
    { type: "heading", text: "Tajuk bahagian" },
    { type: "paragraph", text: "Perenggan dengan **teks tebal** dan [pautan dalaman](/panduan/)." },
    { type: "list", items: ["Butiran satu", "Butiran dua"] },
    { type: "ordered", items: ["Langkah pertama", "Langkah kedua"] },
    { type: "table", head: ["Perkara", "Tarikh"], rows: [["Contoh", "1 Januari 2027"]], caption: "Jadual contoh" },
    { type: "callout", text: "Nota penting untuk pembaca." },
    { type: "cta", links: [{ label: "Lihat demo langsung", href: "/tv/?demo=1" }, { label: "Daftar masjid anda", href: "/admin/" }] },
    { type: "faq", items: [{ q: "Soalan contoh?", a: "Jawapan contoh." }] },
  ],
  related: [],
  draft: true,
};

export default article;
