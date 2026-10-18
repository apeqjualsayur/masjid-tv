// Slides from public/config/sample-slides.json (Phase 1). Field names follow the Phase 2
// `slides` table (PRD section 9.5) so the same shape can later come from Supabase.
import type { PlaylistItem } from "@/core";
import {
  APPROVED_TRANSLATION_SOURCES,
  OCCASION_LABEL,
  TEMPLATE_KEYS,
  type SlideView,
  type TemplateKey,
} from "@/templates";
import type { FetchLike } from "./types";

export interface RawSlide {
  id: string;
  type: "poster" | "template";
  template_key?: TemplateKey;
  fields?: Record<string, unknown>;
  image_url?: string;
  starts_at?: string;
  ends_at?: string;
  duration_s?: number;
  /** 0 = Ahad ... 6 = Sabtu */
  days_of_week?: number[];
  priority?: boolean;
  sort_order?: number;
  status?: "active" | "draft";
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (f: Record<string, unknown>, k: string) => typeof f[k] === "string" && (f[k] as string).trim() !== "";
const numb = (f: Record<string, unknown>, k: string) => typeof f[k] === "number" && Number.isFinite(f[k] as number);
const arr = (f: Record<string, unknown>, k: string) => Array.isArray(f[k]);

/** Minimum fields each template needs to render meaningfully. */
const REQUIRED: Record<TemplateKey, (f: Record<string, unknown>) => boolean> = {
  pengumuman: (f) => str(f, "title") && str(f, "body"),
  kuliah: (f) => str(f, "series") && str(f, "topic") && str(f, "speaker"),
  kematian: (f) => str(f, "name") && isObj(f.solatJenazah),
  program: (f) => str(f, "title"),
  infaq: (f) => str(f, "fundName") && numb(f, "collected") && numb(f, "target"),
  mesyuarat: (f) => str(f, "title"),
  imam_bilal: (f) => str(f, "weekRange") && arr(f, "table"),
  kewangan: (f) => str(f, "weekRange") && arr(f, "income") && arr(f, "expense") && numb(f, "balance"),
  // Translation must come from an approved source (PRD section 7).
  ayat: (f) => str(f, "arabic") && str(f, "translation") && str(f, "reference") && typeof f.source === "string" && f.source in APPROVED_TRANSLATION_SOURCES,
  ucapan: (f) => typeof f.occasion === "string" && f.occasion in OCCASION_LABEL && str(f, "message"),
};

export function parseSlides(raw: unknown): { items: PlaylistItem<SlideView>[]; warnings: string[] } {
  const warnings: string[] = [];
  const list = Array.isArray(raw) ? raw : isObj(raw) && Array.isArray(raw.slides) ? raw.slides : null;
  if (!list) return { items: [], warnings: ["sample-slides.json: expected an array of slides"] };

  const items: PlaylistItem<SlideView>[] = [];
  const seen = new Set<string>();
  list.forEach((r: unknown, i: number) => {
    const where = isObj(r) && typeof r.id === "string" ? `slide "${r.id}"` : `slide #${i + 1}`;
    if (!isObj(r) || typeof r.id !== "string" || !r.id) return warnings.push(`${where}: missing id`);
    if (seen.has(r.id)) return warnings.push(`${where}: duplicate id`);
    const s = r as unknown as RawSlide;

    let payload: SlideView;
    if (s.type === "poster") {
      if (typeof s.image_url !== "string" || !s.image_url) return warnings.push(`${where}: poster without image_url`);
      payload = { kind: "poster", imageUrl: s.image_url };
    } else if (s.type === "template") {
      const key = s.template_key;
      if (!key || !TEMPLATE_KEYS.includes(key)) return warnings.push(`${where}: unknown template_key "${String(key)}"`);
      if (!isObj(s.fields) || !REQUIRED[key](s.fields)) return warnings.push(`${where}: fields missing or invalid for ${key}`);
      payload = { kind: "template", template: key, fields: s.fields } as unknown as SlideView;
    } else {
      return warnings.push(`${where}: type must be "poster" or "template"`);
    }

    seen.add(s.id);
    items.push({
      id: s.id,
      durationS: typeof s.duration_s === "number" && s.duration_s > 0 ? s.duration_s : undefined,
      startsAt: typeof s.starts_at === "string" ? s.starts_at : undefined,
      endsAt: typeof s.ends_at === "string" ? s.ends_at : undefined,
      daysOfWeek: Array.isArray(s.days_of_week) ? s.days_of_week.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : undefined,
      priority: s.priority === true,
      sortOrder: typeof s.sort_order === "number" ? s.sort_order : undefined,
      status: s.status === "draft" ? "draft" : "active",
      payload,
    });
  });
  return { items, warnings };
}

/** Load the slide list; a missing or broken file gives an empty playlist (layouts then fall back to full). */
export async function loadSlides(fetchImpl: FetchLike = fetch, url = "/config/sample-slides.json") {
  try {
    const res = await fetchImpl(url, { cache: "no-cache" });
    if (!res.ok) return { items: [], warnings: [`${url}: HTTP ${res.status}`] };
    return parseSlides(await res.json());
  } catch (e) {
    return { items: [], warnings: [`${url}: ${String(e)}`] };
  }
}