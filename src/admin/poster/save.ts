// Saving a poster slide (PRD Phase 2 §6): upload to media/{org_id}/{uuid}.webp → media row →
// slide (type poster). Edit: new image replaces the old one (old row + file deleted afterwards),
// or only the schedule/status changes. Order is unit-tested (save.test.ts).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SlideScheduleRow } from "../schedule/logic";
import type { Encoded } from "./encode";

export type SlideStatus = "draft" | "published";

export interface PosterBackend {
  uploadObject(path: string, blob: Blob, contentType: string): Promise<void>;
  insertMedia(row: { org_id: string; path: string; kind: "poster" | "qr" | "photo"; width: number; height: number; bytes: number }): Promise<string>;
  insertSlide(row: Record<string, unknown>): Promise<string>;
  updateSlide(id: string, patch: Record<string, unknown>): Promise<void>;
  deleteMedia(path: string): Promise<void>;
  removeObject(path: string): Promise<void>;
}

export interface SaveInput {
  orgId: string;
  image: Encoded | null;
  schedule: SlideScheduleRow;
  status: SlideStatus;
  /** Edit mode. */
  existing?: { slideId: string; path: string } | null;
}

const contentType = (ext: Encoded["ext"]) => (ext === "webp" ? "image/webp" : "image/jpeg");

async function drop(b: PosterBackend, path: string): Promise<boolean> {
  const row = await b.deleteMedia(path).then(() => true, () => false);
  const file = await b.removeObject(path).then(() => true, () => false);
  return row && file;
}

export async function savePoster(b: PosterBackend, input: SaveInput, newId: () => string): Promise<{ slideId: string; oldRemoved: boolean }> {
  const { orgId, image, schedule, status, existing } = input;
  if (!image) {
    if (!existing) throw new Error("no_image");
    await b.updateSlide(existing.slideId, { ...schedule, status });
    return { slideId: existing.slideId, oldRemoved: true };
  }
  const path = `${orgId}/${newId()}.${image.ext}`;
  await b.uploadObject(path, image.blob, contentType(image.ext));
  let slideId: string;
  try {
    const mediaId = await b.insertMedia({ org_id: orgId, path, kind: "poster", width: image.width, height: image.height, bytes: image.blob.size });
    if (existing) {
      await b.updateSlide(existing.slideId, { media_id: mediaId, ...schedule, status });
      slideId = existing.slideId;
    } else {
      slideId = await b.insertSlide({ org_id: orgId, type: "poster", media_id: mediaId, template_key: null, fields: {}, ...schedule, status });
    }
  } catch (e) {
    await drop(b, path);
    throw e;
  }
  // The slide points at the new image now; the old one can go (best effort).
  const oldRemoved = existing && existing.path !== path ? await drop(b, existing.path) : true;
  return { slideId, oldRemoved };
}

export function supabasePosterBackend(sb: SupabaseClient, userId: string): PosterBackend {
  const media = () => sb.storage.from("media");
  return {
    async uploadObject(path, blob, ct) {
      const { error } = await media().upload(path, blob, { contentType: ct, upsert: false, cacheControl: "31536000" });
      if (error) throw error;
    },
    async insertMedia(row) {
      const { data, error } = await sb.from("media").insert({ ...row, created_by: userId }).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    async insertSlide(row) {
      const { data, error } = await sb.from("slides").insert(row).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    async updateSlide(id, patch) {
      const { error } = await sb.from("slides").update(patch).eq("id", id);
      if (error) throw error;
    },
    async deleteMedia(path) {
      const { data, error } = await sb.from("media").delete().eq("path", path).select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("not_removed");
    },
    async removeObject(path) {
      const { data, error } = await media().remove([path]);
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("not_removed");
    },
  };
}