// "Pasang app di TV" (PRD enhancements §8.5): what shows with and without latest.json.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LangProvider } from "../i18n";
import ms from "../i18n/ms.json";
import { InstallAppCard } from "./InstallAppCard";

const html = (node: React.ReactNode) => renderToStaticMarkup(<LangProvider>{node}</LangProvider>);
const latest = { versionCode: 1, versionName: "1.0.0", sha256: "ab", bytes: 2_412_544, date: "2026-11-20T03:00:00Z", notes: "" };

describe("Pasang app di TV card", () => {
  it("Skrin page: open the first time, with version, size, link, download, steps and the kiosk note", () => {
    const out = html(<InstallAppCard latest={latest} remember />);
    expect(out).toContain(ms.screens.app.title);
    expect(out).toMatch(/Versi 1\.0\.0 · 2\.3 MB · /);
    expect(out).toContain("masjidview.my/apk");
    expect(out).toContain('href="/apk/masjidview-tv.apk"');
    expect(out).toContain(ms.screens.app.copy);
    expect(out.match(/<li /g)).toHaveLength(5);
    expect(out).toContain(ms.screens.app.kiosk);
    expect(out).toContain('aria-expanded="true"');
  });
  it("without latest.json: no version line, the steps still show", () => {
    const out = html(<InstallAppCard latest={null} remember />);
    expect(out).not.toMatch(/Versi \d/);
    expect(out).toContain(ms.screens.app.noInfo);
    expect(out.match(/<li /g)).toHaveLength(5);
  });
  it("Tambah skrin sheet: starts closed", () => {
    const out = html(<InstallAppCard latest={latest} />);
    expect(out).toContain(ms.screens.app.sheetTitle);
    expect(out).toContain('aria-expanded="false"');
    expect(out).not.toContain(ms.screens.app.kiosk);
  });
});
