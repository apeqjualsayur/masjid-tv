// Landing page with themes round 2 switched on (T10): 7 themes in the Numbers band, Tema and Cuba
// sekarang, and the "Dua TV, dua tugas" card. With the switch off it stays at the 3 launch themes.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { landingThemes, showDualScreens } from "./themes-list";

vi.mock("@/config/features", () => ({ THEMES_ROUND2_VISIBLE: true }));

describe("landing with round 2 on", () => {
  it("theme list follows the switch", () => {
    expect(landingThemes(false)).toEqual(["tenang", "serambi", "alam"]);
    expect(landingThemes(true)).toEqual(["tenang", "serambi", "alam", "falak", "garis", "kerawang", "seterusnya"]);
    expect(showDualScreens(false)).toBe(false);
  });

  it.each(["ms", "en"] as const)("%s: Numbers says 7, Cuba has 7 pressed-state buttons, Tema has 7 entries, Ciri-ciri has the dual card", async (lang) => {
    const { Numbers } = await import("./Numbers");
    const { TrySection } = await import("./try");
    const { ThemesSection } = await import("./showcase");
    const { Features } = await import("./sections");
    const { copy } = await import("./i18n");
    expect(renderToStaticMarkup(<Numbers lang={lang} />)).toMatch(/tracking-\[-1px\] text-lb-deep">7<\/span>/);
    const tryOut = renderToStaticMarkup(<TrySection lang={lang} />);
    expect(tryOut.match(/aria-pressed="(true|false)"/g)).toHaveLength(7);
    expect(tryOut.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(tryOut).toContain("flex-wrap");
    const tema = renderToStaticMarkup(<ThemesSection lang={lang} />);
    expect(tema.match(/<h3 /g)).toHaveLength(7);
    expect(tema).toContain(copy(lang).themes.titleAll);
    const feat = renderToStaticMarkup(<Features lang={lang} />);
    expect(feat).toContain(copy(lang).features.dual.t);
    expect(feat.match(/<li /g)).toHaveLength(9);
  });

  it("every theme has BM and EN copy", async () => {
    const { copy } = await import("./i18n");
    for (const lang of ["ms", "en"] as const) {
      expect(copy(lang).themes.items.map((x) => x.id)).toEqual(landingThemes(true));
      for (const id of landingThemes(true)) expect(copy(lang).try.themes[id as keyof ReturnType<typeof copy>["try"]["themes"]]).toBeTruthy();
    }
  });
});
