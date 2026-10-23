import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { resolveTemplateKey, SAMPLE_FIELDS, sampleSlide, TEMPLATE_KEYS } from "@/templates";
import { TEMPLATES, defaultFields } from "@/templates/schema";
import { LangProvider } from "../i18n";
import en from "../i18n/en.json";
import ms from "../i18n/ms.json";
import { UnknownTemplate } from "./EditorView";

/** The 10 keys from the single source of truth: the template_key check in _specs/11-schema.sql. */
function schemaKeys(): string[] {
  const sql = readFileSync(join(process.cwd(), "_specs", "11-schema.sql"), "utf8");
  const m = /template_key\s+text\s+check\s*\(template_key\s+in\s*\(([^)]*)\)/i.exec(sql);
  if (!m) throw new Error("template_key check not found in 11-schema.sql");
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
}

describe("template editor keys (/admin/templat/?key=)", () => {
  const keys = schemaKeys();

  it("the schema lists exactly the 10 keys, and the registry uses the same ids", () => {
    expect(keys).toEqual(["pengumuman", "kuliah", "kematian", "program", "infaq", "mesyuarat", "imam_bilal", "kewangan", "ayat", "ucapan"]);
    expect([...TEMPLATE_KEYS]).toEqual(keys);
    expect(Object.keys(TEMPLATES).sort()).toEqual([...keys].sort());
  });

  for (const k of schemaKeys()) {
    it(`${k}: resolves to a template with a schema, form fields and sample data`, () => {
      const key = resolveTemplateKey(k);
      expect(key).toBe(k);
      const meta = TEMPLATES[key!];
      expect(meta.key).toBe(k);
      expect(meta.fields.length).toBeGreaterThan(0);
      expect(meta.fields.every((f) => f.key && f.label.ms && f.label.en)).toBe(true);
      expect(defaultFields(key!)).toBeTypeOf("object");
      expect(SAMPLE_FIELDS[key!]).toBeTruthy();
      expect(sampleSlide(key!)).toMatchObject({ kind: "template", template: k });
    });
  }

  it("an unknown or missing key resolves to nothing", () => {
    for (const bad of ["imam-bilal", "Imam_Bilal", "poster", "", null, undefined]) expect(resolveTemplateKey(bad)).toBeNull();
  });

  it('an unknown key still shows the "Unknown template" message', () => {
    expect(en.editor.unknownTemplate).toBe("Unknown template.");
    const html = renderToStaticMarkup(
      <LangProvider>
        <UnknownTemplate />
      </LangProvider>,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain(ms.editor.unknownTemplate);
  });
});