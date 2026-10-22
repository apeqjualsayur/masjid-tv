// Saving a template slide (PRD Phase 2 §4.5). New images (QR ≤ 800 px, speaker photo ≤ 512 px) are
// uploaded first and their bucket path goes into the fields; then the slide is inserted or updated;
// then images that were replaced or removed are deleted — unless another slide still uses them
// (a "Duplikasi untuk minggu depan" copy shares the file). Order is unit-tested.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Fields, ImageField } from "@/templates/schema";
import type { TemplateKey } from "@/templates";
import type { Encoded } from "../poster/encode";
import { supabasePosterBackend, type PosterBackend, type SlideStatus } from "../poster/save";
import type { SlideScheduleRow } from "../schedule/logic";

export interface TemplateBackend extends PosterBackend {
  /** True when another slide (not `exceptSlideId`) still has this image path in field `key`. */
  isReferenced(key: string, path: string, exceptSlideId: string | null): Promise<boolean>;
}

export interface TemplateSaveInput {
  orgId: string;
  templateKey: TemplateKey;
  fields: Fields;
  /** New pictures picked in this session, by field key. */
  pending: Record<string, { encoded: Encoded; kind: ImageField["imageKind"] }>;
  /** Fields as last saved (edit mode), to find images that are no longer used. */
  original: Fields | null;
  imageKeys: readonly string[];
  schedule: SlideScheduleRow;
  status: SlideStatus;
  slideId: string | null;
}

const ct = (ext: Encoded["ext"]) => (ext === "webp" ? "image/webp" : "image/jpeg");

async function drop(b: PosterBackend, path: string): Promise<boolean> {
  const row = await b.deleteMedia(path).then(() => true, () => false);
  const file = await b.removeObject(path).then(() => true, () => false);
  return row && file;
}

export async function saveTemplateSlide(b: TemplateBackend, i: TemplateSaveInput, newId: () => string): Promise<{ slideId: string; oldRemoved: boolean }> {
  let fields: Fields = { ...i.fields };
  const uploaded: string[] = [];
  let slideId: string;
  try {
    for (const [key, p] of Object.entries(i.pending)) {
      const path = `${i.orgId}/${newId()}.${p.encoded.ext}`;
      await b.uploadObject(path, p.encoded.blob, ct(p.encoded.ext));
      uploaded.push(path);
      await b.insertMedia({ org_id: i.orgId, path, kind: p.kind, width: p.encoded.width, height: p.encoded.height, bytes: p.encoded.blob.size });
      fields = { ...fields, [key]: path };
    }
    const row = { template_key: i.templateKey, fields, ...i.schedule, status: i.status };
    if (i.slideId) {
      await b.updateSlide(i.slideId, row);
      slideId = i.slideId;
    } else {
      slideId = await b.insertSlide({ org_id: i.orgId, type: "template", media_id: null, ...row });
    }
  } catch (e) {
    for (const p of uploaded) await drop(b, p);
    throw e;
  }
  let oldRemoved = true;
  if (i.original) {
    for (const key of i.imageKeys) {
      const old = i.original[key];
      if (typeof old !== "string" || !old || old === fields[key]) continue;
      if (await b.isReferenced(key, old, slideId).catch(() => true)) continue; // still used elsewhere: keep
      if (!(await drop(b, old))) oldRemoved = false;
    }
  }
  return { slideId, oldRemoved };
}

export function supabaseTemplateBackend(sb: SupabaseClient, userId: string, orgId: string): TemplateBackend {
  return {
    ...supabasePosterBackend(sb, userId),
    async isReferenced(key, path, exceptSlideId) {
      let q = sb.from("slides").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq(`fields->>${key}`, path);
      if (exceptSlideId) q = q.neq("id", exceptSlideId);
      const { count, error } = await q;
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  };
}