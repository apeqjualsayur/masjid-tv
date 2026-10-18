// Writes public/config/sample-slides.json from the template samples (src/templates/samples.ts):
//   npx tsx scripts/make-sample-slides.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RawSlide } from "../src/data/slides";
import { SAMPLE_FIELDS } from "../src/templates/samples";

const t = (id: string, key: keyof typeof SAMPLE_FIELDS, order: number, extra: Partial<RawSlide> = {}): RawSlide => ({
  id,
  type: "template",
  template_key: key,
  fields: SAMPLE_FIELDS[key] as unknown as Record<string, unknown>,
  sort_order: order,
  status: "active",
  ...extra,
});

const slides: RawSlide[] = [
  t("pengumuman-1", "pengumuman", 10, { priority: true }),
  t("kuliah-1", "kuliah", 20),
  { id: "poster-potret", type: "poster", image_url: "/config/poster-portrait.svg", sort_order: 30, duration_s: 10, status: "active" },
  t("program-1", "program", 40),
  t("infaq-1", "infaq", 50),
  t("mesyuarat-1", "mesyuarat", 60, { days_of_week: [0, 1, 2, 3, 4, 5, 6] }),
  t("imam-bilal-1", "imam_bilal", 70, { duration_s: 20 }),
  t("kewangan-1", "kewangan", 80, { duration_s: 20 }),
  { id: "poster-landskap", type: "poster", image_url: "/config/poster-landscape.svg", sort_order: 90, duration_s: 10, status: "active" },
  t("ayat-1", "ayat", 100),
  t("ucapan-1", "ucapan", 110),
  t("kematian-1", "kematian", 120, { ends_at: "2027-12-31" }),
  // Expired example: skipped by the playlist (ends_at is in the past).
  t("pengumuman-lama", "pengumuman", 5, { ends_at: "2026-01-01", fields: { ...SAMPLE_FIELDS.pengumuman, title: "[Pengumuman yang sudah tamat]" } }),
];

const out = join(process.cwd(), "public", "config", "sample-slides.json");
writeFileSync(out, JSON.stringify(slides, null, 2) + "\n");
console.log(`Wrote ${out} (${slides.length} slides)`);