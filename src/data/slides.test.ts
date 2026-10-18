import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { parseLocalDateTime, playlistAt } from "@/core";
import { TEMPLATE_KEYS } from "@/templates";
import { loadSlides, parseSlides } from "./slides";

const sample = JSON.parse(readFileSync(join(process.cwd(), "public", "config", "sample-slides.json"), "utf8"));

describe("public/config/sample-slides.json", () => {
  const { items, warnings } = parseSlides(sample);

  it("parses cleanly: one of each template, two posters, one expired example", () => {
    expect(warnings).toEqual([]);
    expect(items).toHaveLength(13);
    const templates = items.flatMap((x) => (x.payload.kind === "template" ? [x.payload.template] : []));
    for (const k of TEMPLATE_KEYS) expect(templates).toContain(k);
    const posters = items.filter((x) => x.payload.kind === "poster").map((x) => (x.payload as { imageUrl: string }).imageUrl);
    expect(posters).toEqual(["/config/poster-portrait.svg", "/config/poster-landscape.svg"]);
  });

  it("posters exist in public/config", () => {
    for (const f of ["poster-portrait.svg", "poster-landscape.svg"]) {
      expect(readFileSync(join(process.cwd(), "public", "config", f), "utf8")).toContain("<svg");
    }
  });

  it("placeholder text is in brackets", () => {
    const p = items.find((x) => x.id === "pengumuman-1")!.payload;
    expect(p.kind === "template" && (p.fields as { title: string }).title).toMatch(/^\[.*\]$/);
  });

  it("12 slides rotate today; the expired one is skipped", () => {
    const now = parseLocalDateTime("2026-10-17T10:00:00")!;
    const seen = new Set<string>();
    for (let t = now; t < now + 30 * 60_000; t += 1000) seen.add(playlistAt(items, t)!.item.id);
    expect(seen.size).toBe(12);
    expect(seen.has("pengumuman-lama")).toBe(false);
  });
});

describe("parseSlides validation", () => {
  it("skips bad entries with a warning and keeps the good ones", () => {
    const { items, warnings } = parseSlides([
      { id: "ok", type: "poster", image_url: "/x.png" },
      { id: "ok", type: "poster", image_url: "/y.png" },
      { type: "poster", image_url: "/z.png" },
      { id: "p", type: "poster" },
      { id: "t", type: "template", template_key: "nope", fields: {} },
      { id: "u", type: "template", template_key: "pengumuman", fields: { title: "x" } },
      { id: "a", type: "template", template_key: "ayat", fields: { arabic: "x", translation: "y", reference: "z", source: "free-text" } },
      { id: "w", type: "video" },
    ]);
    expect(items.map((x) => x.id)).toEqual(["ok"]);
    expect(warnings).toHaveLength(7);
    expect(warnings.join(" ")).toMatch(/duplicate id/);
    expect(warnings.join(" ")).toMatch(/fields missing or invalid for ayat/);
  });

  it("maps the Phase 2 field names", () => {
    const { items } = parseSlides([
      { id: "x", type: "poster", image_url: "/x.png", duration_s: 8, days_of_week: [5, 9], priority: true, sort_order: 3, ends_at: "2026-12-31", status: "draft" },
    ]);
    expect(items[0]).toMatchObject({ durationS: 8, daysOfWeek: [5], priority: true, sortOrder: 3, endsAt: "2026-12-31", status: "draft" });
  });

  it("accepts { slides: [...] } and rejects non-lists", () => {
    expect(parseSlides({ slides: [{ id: "x", type: "poster", image_url: "/x.png" }] }).items).toHaveLength(1);
    expect(parseSlides("nope").items).toEqual([]);
  });

  it("loadSlides: a missing file gives an empty playlist, not an error", async () => {
    const fail = vi.fn(async () => new Response("", { status: 404 }));
    expect(await loadSlides(fail)).toEqual({ items: [], warnings: ["/config/sample-slides.json: HTTP 404"] });
    const offline = vi.fn(async (): Promise<Response> => {
      throw new TypeError("Failed to fetch");
    });
    expect((await loadSlides(offline)).items).toEqual([]);
  });
});