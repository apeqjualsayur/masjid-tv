import { describe, expect, it, vi } from "vitest";
import type { SlideScheduleRow } from "../schedule/logic";
import type { Encoded } from "./encode";
import { savePoster, type PosterBackend } from "./save";

const schedule: SlideScheduleRow = { starts_at: "2026-10-22T00:00:00.000Z", ends_at: null, duration_s: 15, days_of_week: null, priority: false, screen_ids: null };
const image: Encoded = { blob: new Blob([new Uint8Array(310)], { type: "image/webp" }), width: 1080, height: 1350, ext: "webp", originalWidth: 2160, originalHeight: 2700 };

function backend(over: Partial<PosterBackend> = {}) {
  const calls: string[] = [];
  const b: PosterBackend = {
    uploadObject: vi.fn(async (p: string, _b: Blob, ct: string) => void calls.push(`upload ${p} ${ct}`)),
    insertMedia: vi.fn(async (r) => (calls.push(`media ${r.path} ${r.kind} ${r.width}x${r.height} ${r.bytes}`), "media-new")),
    insertSlide: vi.fn(async (r) => (calls.push(`slide insert ${r.type} ${r.media_id} ${r.status} ${r.starts_at}`), "slide-1")),
    updateSlide: vi.fn(async (id: string, p: Record<string, unknown>) => void calls.push(`slide update ${id} ${p.media_id ?? "-"} ${p.status}`)),
    deleteMedia: vi.fn(async (p: string) => void calls.push(`delete media ${p}`)),
    removeObject: vi.fn(async (p: string) => void calls.push(`remove ${p}`)),
    ...over,
  };
  return { b, calls };
}

describe("savePoster", () => {
  it("new poster: upload → media row → slide (type poster)", async () => {
    const { b, calls } = backend();
    expect(await savePoster(b, { orgId: "org", image, schedule, status: "published" }, () => "u1")).toEqual({ slideId: "slide-1", oldRemoved: true });
    expect(calls).toEqual(["upload org/u1.webp image/webp", "media org/u1.webp poster 1080x1350 310", "slide insert poster media-new published 2026-10-22T00:00:00.000Z"]);
  });

  it("JPEG fallback keeps an honest extension and type", async () => {
    const { b, calls } = backend();
    await savePoster(b, { orgId: "org", image: { ...image, ext: "jpg" }, schedule, status: "draft" }, () => "u1");
    expect(calls[0]).toBe("upload org/u1.jpg image/jpeg");
  });

  it("a failed slide insert removes the uploaded file and its row", async () => {
    const { b, calls } = backend({ insertSlide: vi.fn(async () => Promise.reject({ message: "new row violates row-level security" })) });
    await expect(savePoster(b, { orgId: "org", image, schedule, status: "published" }, () => "u1")).rejects.toMatchObject({ message: expect.stringContaining("row-level") });
    expect(calls).toEqual(["upload org/u1.webp image/webp", "media org/u1.webp poster 1080x1350 310", "delete media org/u1.webp", "remove org/u1.webp"]);
  });

  it("a failed upload changes nothing", async () => {
    const { b, calls } = backend({ uploadObject: vi.fn(async () => Promise.reject(new Error("413"))) });
    await expect(savePoster(b, { orgId: "org", image, schedule, status: "published" }, () => "u1")).rejects.toThrow("413");
    expect(calls).toEqual([]);
  });

  it("edit with a new image: slide points at the new one first, then the old row and file are deleted", async () => {
    const { b, calls } = backend();
    expect(await savePoster(b, { orgId: "org", image, schedule, status: "published", existing: { slideId: "s9", path: "org/old.webp" } }, () => "u2")).toEqual({ slideId: "s9", oldRemoved: true });
    expect(calls).toEqual(["upload org/u2.webp image/webp", "media org/u2.webp poster 1080x1350 310", "slide update s9 media-new published", "delete media org/old.webp", "remove org/old.webp"]);
  });

  it("edit: if the old file cannot be deleted it is reported, not thrown", async () => {
    const { b } = backend({ deleteMedia: vi.fn(async () => Promise.reject(new Error("not_removed"))) });
    expect(await savePoster(b, { orgId: "org", image, schedule, status: "published", existing: { slideId: "s9", path: "org/old.webp" } }, () => "u2")).toEqual({ slideId: "s9", oldRemoved: false });
  });

  it("edit schedule only: one update, no upload", async () => {
    const { b, calls } = backend();
    await savePoster(b, { orgId: "org", image: null, schedule, status: "draft", existing: { slideId: "s9", path: "org/old.webp" } }, () => "x");
    expect(calls).toEqual(["slide update s9 - draft"]);
  });
});