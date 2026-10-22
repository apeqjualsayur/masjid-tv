import { describe, expect, it, vi } from "vitest";
import type { Encoded } from "../poster/encode";
import type { SlideScheduleRow } from "../schedule/logic";
import { saveTemplateSlide, type TemplateBackend, type TemplateSaveInput } from "./save";

const schedule: SlideScheduleRow = { starts_at: "2026-10-22T00:00:00.000Z", ends_at: null, duration_s: 15, days_of_week: null, priority: false, screen_ids: null };
const qr: Encoded = { blob: new Blob([new Uint8Array(42)], { type: "image/webp" }), width: 800, height: 800, ext: "webp", originalWidth: 1200, originalHeight: 1200 };

function backend(over: Partial<TemplateBackend> = {}, referenced = false) {
  const calls: string[] = [];
  const b: TemplateBackend = {
    uploadObject: vi.fn(async (p: string) => void calls.push(`upload ${p}`)),
    insertMedia: vi.fn(async (r) => (calls.push(`media ${r.path} ${r.kind} ${r.width}`), "m1")),
    insertSlide: vi.fn(async (r) => (calls.push(`insert ${r.type} ${r.template_key} ${JSON.stringify(r.fields)} ${r.status}`), "s-new")),
    updateSlide: vi.fn(async (id: string, r: Record<string, unknown>) => void calls.push(`update ${id} ${JSON.stringify(r.fields)} ${r.status}`)),
    deleteMedia: vi.fn(async (p: string) => void calls.push(`delete media ${p}`)),
    removeObject: vi.fn(async (p: string) => void calls.push(`remove ${p}`)),
    isReferenced: vi.fn(async (k: string, p: string) => (calls.push(`referenced? ${k} ${p}`), referenced)),
    ...over,
  };
  return { b, calls };
}
const base = (over: Partial<TemplateSaveInput> = {}): TemplateSaveInput => ({
  orgId: "org", templateKey: "infaq", fields: { fundName: "Tabung", collected: 1, target: 2 }, pending: {}, original: null, imageKeys: ["qrImage", "speakerPhoto"], schedule, status: "published", slideId: null, ...over,
});

describe("saveTemplateSlide", () => {
  it("new slide without images: one insert (type template)", async () => {
    const { b, calls } = backend();
    expect(await saveTemplateSlide(b, base(), () => "u")).toEqual({ slideId: "s-new", oldRemoved: true });
    expect(calls).toEqual([`insert template infaq {"fundName":"Tabung","collected":1,"target":2} published`]);
  });

  it("new QR image: upload → media row (kind qr) → slide with the bucket path", async () => {
    const { b, calls } = backend();
    await saveTemplateSlide(b, base({ pending: { qrImage: { encoded: qr, kind: "qr" } } }), () => "u1");
    expect(calls).toEqual(["upload org/u1.webp", "media org/u1.webp qr 800", `insert template infaq {"fundName":"Tabung","collected":1,"target":2,"qrImage":"org/u1.webp"} published`]);
  });

  it("a failed save removes the image it just uploaded", async () => {
    const { b, calls } = backend({ insertSlide: vi.fn(async () => Promise.reject({ message: "check constraint" })) });
    await expect(saveTemplateSlide(b, base({ pending: { qrImage: { encoded: qr, kind: "qr" } } }), () => "u1")).rejects.toMatchObject({ message: "check constraint" });
    expect(calls).toEqual(["upload org/u1.webp", "media org/u1.webp qr 800", "delete media org/u1.webp", "remove org/u1.webp"]);
  });

  it("edit: replaced image is deleted after the slide is updated", async () => {
    const { b, calls } = backend();
    await saveTemplateSlide(b, base({ slideId: "s9", original: { qrImage: "org/old.webp" }, pending: { qrImage: { encoded: qr, kind: "qr" } } }), () => "u2");
    expect(calls).toEqual([
      "upload org/u2.webp", "media org/u2.webp qr 800",
      `update s9 {"fundName":"Tabung","collected":1,"target":2,"qrImage":"org/u2.webp"} published`,
      "referenced? qrImage org/old.webp", "delete media org/old.webp", "remove org/old.webp",
    ]);
  });

  it("edit: a removed image is deleted too", async () => {
    const { b, calls } = backend();
    await saveTemplateSlide(b, base({ slideId: "s9", original: { speakerPhoto: "org/p.webp" }, templateKey: "kuliah", fields: { topic: "x" } }), () => "u");
    expect(calls.slice(1)).toEqual(["referenced? speakerPhoto org/p.webp", "delete media org/p.webp", "remove org/p.webp"]);
  });

  it("an image still used by another slide (weekly copy) is kept", async () => {
    const { b, calls } = backend({}, true);
    await saveTemplateSlide(b, base({ slideId: "s9", original: { qrImage: "org/shared.webp" }, pending: { qrImage: { encoded: qr, kind: "qr" } } }), () => "u3");
    expect(calls.at(-1)).toBe("referenced? qrImage org/shared.webp");
    expect(calls.some((c) => c.startsWith("remove org/shared"))).toBe(false);
  });

  it("unchanged image: nothing deleted", async () => {
    const { b, calls } = backend();
    await saveTemplateSlide(b, base({ slideId: "s9", original: { qrImage: "org/same.webp" }, fields: { fundName: "T", qrImage: "org/same.webp" }, status: "draft" }), () => "u");
    expect(calls).toEqual([`update s9 {"fundName":"T","qrImage":"org/same.webp"} draft`]);
  });
});