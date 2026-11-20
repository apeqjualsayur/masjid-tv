// Hari Kebesaran editor extras (PRD enhancements §5.5).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { localDateKey } from "@/core";
import { LangProvider } from "../i18n";
import ms from "../i18n/ms.json";
import type { TakwimRow } from "../platform/takwim";
import { KebesaranFields } from "./KebesaranFields";

const html = (fields: Record<string, unknown>, takwim: TakwimRow[] | null, errors = {}) =>
  renderToStaticMarkup(
    <LangProvider>
      <KebesaranFields fields={fields} onChange={() => {}} errors={errors} takwim={takwim} takwimError={null} />
    </LangProvider>,
  );
const inDays = (n: number) => localDateKey(Date.now() + n * 86_400_000);

describe("Hari Kebesaran editor", () => {
  it("all 9 events are ticked by default (no events field)", () => {
    const out = html({}, []);
    expect(out.match(/type="checkbox"/g)).toHaveLength(9);
    expect(out.match(/checked=""/g)).toHaveLength(9);
  });
  it("a saved choice ticks only those events", () => {
    expect(html({ events: ["aidilfitri", "aidiladha"] }, []).match(/checked=""/g)).toHaveLength(2);
  });
  it("no dates in the next 12 months → 'Tarikh belum dimuat naik'", () => {
    expect(html({}, [])).toContain(ms.editor.kebesaran.noDates.slice(0, 30));
  });
  it("lists the loaded dates (read-only) with the source note and the jangkaan label", () => {
    const rows: TakwimRow[] = [
      { id: "1", event_key: "awal_ramadan", hijri_year: 1448, greg_date: inDays(30), status: "jangkaan", note: null },
      { id: "2", event_key: "aidilfitri", hijri_year: 1448, greg_date: inDays(60), status: "rasmi", note: null },
    ];
    const out = html({}, rows);
    expect(out).toContain("Awal Ramadan");
    expect(out).toContain("Hari Raya Aidilfitri");
    expect(out).toContain(ms.platform.takwim.status.jangkaan);
    expect(out).toContain(ms.editor.kebesaran.source);
    expect(out).not.toContain('type="date"'); // dates are never edited here
  });
  it("shows the 'choose at least one' error", () => {
    expect(html({ events: [] }, [], { events: { code: "required" } })).toContain(ms.editor.kebesaran.err.events);
  });
});
