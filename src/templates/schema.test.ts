import { describe, expect, it } from "vitest";
import { parseSlides } from "@/data/slides";
import { SAMPLE_FIELDS } from "./samples";
import {
  AYAT_SOURCES, AYAT_VERIFIED, IMAGE_FIELD_KEYS, TEMPLATES, addDaysIso, applyAyat, defaultFields, fixedRowLabel, formatClockBm, formatDateBm, formatRangeBm, getPath, setPath, shiftWeek, validateFields, type Fields,
} from "./schema";
import { APPROVED_TRANSLATION_SOURCES, TEMPLATE_KEYS, type TemplateKey } from "./types";

/** A complete, valid form per template (what an AJK would type). */
const FILLED: Record<TemplateKey, Fields> = {
  pengumuman: { title: "Gotong-royong", body: "Semua dijemput hadir.", issuedBy: "AJK", validUntil: "Sabtu, 24 Oktober 2026", validUntilIso: "2026-10-24" },
  kuliah: { series: "Kuliah Maghrib", topic: "Adab", speaker: "Ustaz Ahmad", date: "Selasa, 20 Oktober 2026", dateIso: "2026-10-20", time: "Selepas Maghrib", venue: "Dewan Solat Utama" },
  kematian: { name: "Allahyarham Ali", age: 72, address: "Taman Melati", solatJenazah: { time: "Selepas Zohor", place: "Masjid ini" }, burialPlace: "Tanah Perkuburan Islam" },
  program: { title: "Hari Keluarga", description: "", date: "Sabtu, 24 Oktober 2026", dateIso: "2026-10-24", time: "8:00 pagi", venue: "Padang", organiser: "", contact: "" },
  infaq: { fundName: "Tabung Pembangunan", purpose: "", collected: 48250, target: 120000, accountName: "" },
  mesyuarat: { title: "Mesyuarat Agung", invitation: "", date: "Jumaat, 30 Oktober 2026", dateIso: "2026-10-30", time: "Selepas Isyak", venue: "Bilik mesyuarat", issuedBy: "" },
  imam_bilal: {
    weekRange: "20 – 26 Oktober 2026", weekRangeIso: ["2026-10-20", "2026-10-26"],
    table: ["subuh", "zohor", "asar", "maghrib", "isyak"].map((w) => ({ waktu: w, imam: "Ust. A", bilal: "Sdr. B" })),
  },
  kewangan: { weekRange: "20 – 26 Oktober 2026", weekRangeIso: ["2026-10-20", "2026-10-26"], income: [{ label: "Tabung Jumaat", amount: 3250 }], expense: [{ label: "Elektrik", amount: 610 }], balance: 15230.4 },
  ayat: applyAyat({}, "baqarah-153"),
  ucapan: { occasion: "aidilfitri", message: "Maaf zahir dan batin", from: "AJK" },
};

describe("template schemas", () => {
  it("every template has a schema with unique field keys and labels in BM and English", () => {
    expect(Object.keys(TEMPLATES).sort()).toEqual([...TEMPLATE_KEYS].sort());
    for (const k of TEMPLATE_KEYS) {
      const keys = TEMPLATES[k].fields.map((f) => f.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const f of TEMPLATES[k].fields) expect(f.label.ms && f.label.en).toBeTruthy();
    }
  });

  it("a filled form validates and is accepted by the TV (same required fields)", () => {
    for (const k of TEMPLATE_KEYS) {
      expect(validateFields(k, FILLED[k]), k).toEqual({});
      const r = parseSlides([{ id: k, type: "template", template_key: k, fields: FILLED[k] }]);
      expect(r.warnings, k).toEqual([]);
    }
  });

  it("the Phase 1 samples are valid too", () => {
    for (const k of TEMPLATE_KEYS) {
      if (k === "ayat") continue; // the sample is a placeholder, not a list entry
      const f = k === "imam_bilal" || k === "kewangan" ? { ...SAMPLE_FIELDS[k] } : SAMPLE_FIELDS[k];
      expect(validateFields(k, f as unknown as Fields), k).toEqual({});
    }
  });

  it("an empty new form shows what is required", () => {
    expect(validateFields("kuliah", defaultFields("kuliah"))).toMatchObject({ topic: { code: "required" }, speaker: { code: "required" }, date: { code: "required" }, time: { code: "required" }, venue: { code: "required" } });
    expect(validateFields("kematian", defaultFields("kematian"))).toMatchObject({ name: { code: "required" }, "solatJenazah.time": { code: "required" }, burialPlace: { code: "required" } });
    expect(validateFields("ayat", defaultFields("ayat"))).toEqual({ ayatId: { code: "required" } });
  });

  it("limits: length, numbers, options, rows", () => {
    expect(validateFields("pengumuman", { ...FILLED.pengumuman, title: "x".repeat(81) }).title).toEqual({ code: "tooLong", max: 80 });
    expect(validateFields("kematian", { ...FILLED.kematian, age: 72.5 }).age).toEqual({ code: "number" });
    expect(validateFields("kematian", { ...FILLED.kematian, age: 200 }).age).toMatchObject({ code: "range" });
    expect(validateFields("infaq", { ...FILLED.infaq, target: 0 }).target).toMatchObject({ code: "range" });
    expect(validateFields("kuliah", { ...FILLED.kuliah, series: "Kuliah Rahsia" }).series).toEqual({ code: "option" });
    expect(validateFields("kewangan", { ...FILLED.kewangan, income: [] }).income).toMatchObject({ code: "rows" });
    expect(validateFields("kewangan", { ...FILLED.kewangan, income: Array.from({ length: 9 }, () => ({ label: "x", amount: 1 })) }).income).toMatchObject({ code: "rows", max: 8 });
    expect(validateFields("kewangan", { ...FILLED.kewangan, expense: [{ label: "x", amount: -5 }] })["expense.0.amount"]).toMatchObject({ code: "range" });
    expect(validateFields("imam_bilal", { ...FILLED.imam_bilal, table: (FILLED.imam_bilal.table as Fields[]).slice(0, 4) }).table).toMatchObject({ code: "rows" });
    expect(validateFields("imam_bilal", { ...FILLED.imam_bilal, table: [{ waktu: "subuh", imam: "", bilal: "B" }, ...(FILLED.imam_bilal.table as Fields[]).slice(1)] })["table.0.imam"]).toEqual({ code: "required" });
  });

  it("Imam & Bilal starts with the 5 prayers; Kewangan with one row each", () => {
    expect((defaultFields("imam_bilal").table as Fields[]).map((r) => r.waktu)).toEqual(["subuh", "zohor", "asar", "maghrib", "isyak"]);
    expect(fixedRowLabel("maghrib")).toBe("Maghrib");
    expect(defaultFields("kewangan").income).toHaveLength(1);
    expect(defaultFields("kuliah").series).toBe("Kuliah Maghrib");
  });
});

describe("Ayat: only from the list, never free text", () => {
  it("the list has 10 entries with Arabic, translation, reference and a known source", () => {
    expect(AYAT_SOURCES).toHaveLength(10);
    for (const a of AYAT_SOURCES) {
      expect(a.arabic).toMatch(/[\u0600-\u06FF]/);
      expect(a.translation.length).toBeGreaterThan(10);
      expect(a.reference).toBeTruthy();
      expect(a.source in APPROVED_TRANSLATION_SOURCES).toBe(true);
    }
    expect(AYAT_VERIFIED).toBe(false); // file still marked TO BE VERIFIED BY AN USTAZ
  });
  it("a chosen entry fills the fields; an edited translation is rejected", () => {
    const f = applyAyat({}, "rad-28");
    expect(f).toMatchObject({ ayatId: "rad-28", reference: "Surah Ar-Ra'd 13:28", source: "draf-belum-disemak" });
    expect(validateFields("ayat", f)).toEqual({});
    expect(validateFields("ayat", { ...f, translation: "terjemahan sendiri" })).toEqual({ ayatId: { code: "ayat" } });
    expect(validateFields("ayat", { ...f, ayatId: "tiada" })).toEqual({ ayatId: { code: "option" } });
  });
});

describe("dates, times and next week", () => {
  it("BM display formats", () => {
    expect(formatDateBm("2026-10-20")).toBe("Selasa, 20 Oktober 2026");
    expect(formatRangeBm("2026-10-20", "2026-10-26")).toBe("20 – 26 Oktober 2026");
    expect(formatRangeBm("2026-10-28", "2026-11-03")).toBe("28 Oktober – 3 November 2026");
    expect(formatRangeBm("2026-12-28", "2027-01-03")).toBe("28 Disember 2026 – 3 Januari 2027");
    expect(formatClockBm("08:30")).toBe("8:30 pagi");
    expect(formatClockBm("13:15")).toBe("1:15 tengah hari");
    expect(formatClockBm("16:45")).toBe("4:45 petang");
    expect(formatClockBm("20:30")).toBe("8:30 malam");
    expect(addDaysIso("2026-12-29", 7)).toBe("2027-01-05");
  });
  it("Duplikasi untuk minggu depan shifts every date by 7 days", () => {
    expect(shiftWeek("kuliah", FILLED.kuliah)).toMatchObject({ dateIso: "2026-10-27", date: "Selasa, 27 Oktober 2026", topic: "Adab" });
    expect(shiftWeek("imam_bilal", FILLED.imam_bilal)).toMatchObject({ weekRangeIso: ["2026-10-27", "2026-11-02"], weekRange: "27 Oktober – 2 November 2026" });
    expect(shiftWeek("kewangan", FILLED.kewangan).weekRange).toBe("27 Oktober – 2 November 2026");
  });
  it("only some templates offer weekly duplication; Kematian has the 7-day rule", () => {
    expect(TEMPLATE_KEYS.filter((k) => TEMPLATES[k].weekly)).toEqual(["kuliah", "imam_bilal", "kewangan"]);
    expect(TEMPLATES.kematian.schedule).toEqual({ endRequired: true, maxDays: 7 });
  });
  it("nested paths and image keys", () => {
    expect(getPath(setPath({}, "solatJenazah.time", "Selepas Zohor"), "solatJenazah.time")).toBe("Selepas Zohor");
    expect(setPath({ a: 1 }, "a", undefined)).toEqual({});
    expect([...IMAGE_FIELD_KEYS].sort()).toEqual(["qrImage", "speakerPhoto"]);
  });
});
describe("parseClockBm", () => {
  it("reads back what formatClockBm writes", async () => {
    const { parseClockBm } = await import("./schema");
    for (const t of ["00:15", "08:30", "12:00", "13:15", "16:45", "20:30", "23:59"]) expect(parseClockBm(formatClockBm(t))).toBe(t);
    expect(parseClockBm("Selepas Maghrib")).toBeNull();
  });
});
