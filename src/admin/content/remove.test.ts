import { describe, expect, it, vi } from "vitest";
import type { ContentRow } from "./logic";
import { removeSlide, type RemoveBackend } from "./remove";

const base: ContentRow = {
  id: "s1", type: "template", template_key: "infaq", fields: { fundName: "T", qrImage: "org/qr.webp" }, media_id: null, status: "published",
  starts_at: "2026-10-20T00:00:00Z", ends_at: null, duration_s: 15, days_of_week: null, priority: false, sort_order: 1, screen_ids: null, created_at: "2026-10-20T00:00:00Z",
};
const KEYS = ["qrImage", "speakerPhoto"];

function backend(over: Partial<RemoveBackend> = {}, referenced = false) {
  const calls: string[] = [];
  const b: RemoveBackend = {
    deleteSlide: vi.fn(async (id: string) => void calls.push(`delete slide ${id}`)),
    deleteMedia: vi.fn(async (p: string) => void calls.push(`delete media ${p}`)),
    removeObject: vi.fn(async (p: string) => void calls.push(`remove ${p}`)),
    isReferenced: vi.fn(async (k: string, p: string) => (calls.push(`referenced? ${k} ${p}`), referenced)),
    ...over,
  };
  return { b, calls };
}

describe("removeSlide", () => {
  it("Infaq: slide first, then its QR row and file", async () => {
    const { b, calls } = backend();
    expect(await removeSlide(b, base, KEYS)).toEqual({ filesRemoved: 1, filesKept: false });
    expect(calls).toEqual(["delete slide s1", "referenced? qrImage org/qr.webp", "delete media org/qr.webp", "remove org/qr.webp"]);
  });

  it("poster: its image is deleted", async () => {
    const { b, calls } = backend();
    await removeSlide(b, { ...base, type: "poster", template_key: null, fields: {}, media_id: "m1", media: { path: "org/p.webp" } }, KEYS);
    expect(calls).toEqual(["delete slide s1", "delete media org/p.webp", "remove org/p.webp"]);
  });

  it("poster shared with a duplicate: the database refuses (23503) and the file is kept, no warning", async () => {
    const { b, calls } = backend({ deleteMedia: vi.fn(async () => Promise.reject({ code: "23503", message: "violates foreign key" })) });
    expect(await removeSlide(b, { ...base, type: "poster", template_key: null, fields: {}, media_id: "m1", media: { path: "org/p.webp" } }, KEYS)).toEqual({ filesRemoved: 0, filesKept: false });
    expect(calls).toEqual(["delete slide s1"]);
  });

  it("QR still used by another slide: kept", async () => {
    const { b, calls } = backend({}, true);
    expect(await removeSlide(b, base, KEYS)).toEqual({ filesRemoved: 0, filesKept: false });
    expect(calls).toEqual(["delete slide s1", "referenced? qrImage org/qr.webp"]);
  });

  it("a file that could not be deleted (e.g. uploaded by someone else) is a warning", async () => {
    const { b } = backend({ deleteMedia: vi.fn(async () => Promise.reject(new Error("not_removed"))) });
    expect(await removeSlide(b, base, KEYS)).toEqual({ filesRemoved: 0, filesKept: true });
  });

  it("if the slide cannot be deleted, no file is touched", async () => {
    const { b, calls } = backend({ deleteSlide: vi.fn(async () => Promise.reject({ message: "rls" })) });
    await expect(removeSlide(b, base, KEYS)).rejects.toMatchObject({ message: "rls" });
    expect(calls).toEqual([]);
  });
});