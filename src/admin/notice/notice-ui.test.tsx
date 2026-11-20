// Admin pieces of PRD enhancements §3.2 / §4.3 that render without a session: the notice buttons and the
// countdown fields (BM by default). The sheet itself writes through Supabase and is checked on dev data.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActivityExtrasFields } from "../editor/ActivityExtras";
import { LangProvider } from "../i18n";
import en from "../i18n/en.json";
import ms from "../i18n/ms.json";
import { NoticeButtons } from "./NoticeSheet";

const html = (node: React.ReactNode) => renderToStaticMarkup(<LangProvider>{node}</LangProvider>);
const KULIAH = { series: "Kuliah Maghrib", topic: "Adab", dateIso: "2026-11-28", date: "Sabtu, 28 November 2026", time: "8:45 malam" };
const noop = () => {};

describe("notice buttons", () => {
  it("no notice: Tangguhkan… and Batalkan…, each at least 44 px tall", () => {
    const out = html(<NoticeButtons fields={KULIAH} onOpen={noop} onWithdraw={noop} />);
    expect(out).toContain(ms.notice.postpone);
    expect(out).toContain(ms.notice.cancelActivity);
    expect(out).not.toContain(ms.notice.withdraw);
    expect(out.match(/class="[^"]*\bh-11\b/g)).toHaveLength(2);
  });
  it("with a notice: Kemas kini notis and Tarik balik notis", () => {
    const out = html(<NoticeButtons fields={{ ...KULIAH, notice: { kind: "batal" } }} onOpen={noop} onWithdraw={noop} />);
    expect(out).toContain(ms.notice.update);
    expect(out).toContain(ms.notice.withdraw);
    expect(out).not.toContain(ms.notice.postpone);
  });
});

describe("countdown fields", () => {
  const fields = (f: Record<string, unknown>, previewAt: number | null = null) => html(<ActivityExtrasFields fields={f} onChange={noop} errors={{}} previewAt={previewAt} onPreviewAt={noop} />);

  it("switch on by default (missing showCountdown), duration and Pratonton pada… shown", () => {
    const out = fields(KULIAH);
    expect(out).toMatch(/role="switch" aria-checked="true"/);
    expect(out).toContain(ms.editor.countdown.duration);
    expect(out).toContain(ms.editor.countdown.previewAt);
    expect(out).toContain(ms.editor.countdown.previewBefore); // exact time → "59 minit sebelum mula"
  });
  it("switched off: no duration or preview time", () => {
    const out = fields({ ...KULIAH, showCountdown: false });
    expect(out).toMatch(/role="switch" aria-checked="false"/);
    expect(out).not.toContain(ms.editor.countdown.duration);
  });
  it("without a date: a hint, no preview time", () => {
    const out = fields({ topic: "Adab" });
    expect(out).toContain(ms.editor.countdown.needsDate);
    expect(out).not.toContain(ms.editor.countdown.previewAt);
  });
  it("prayer-relative time: no '59 minit sebelum' shortcut (no exact start)", () => {
    expect(fields({ ...KULIAH, time: "Selepas Maghrib" })).not.toContain(ms.editor.countdown.previewBefore);
  });
});

it("every new string exists in BM and English", () => {
  const keys = (o: object, p = ""): string[] => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
  expect(keys(en.notice).sort()).toEqual(keys(ms.notice).sort());
  expect(keys(en.editor.countdown).sort()).toEqual(keys(ms.editor.countdown).sort());
});
