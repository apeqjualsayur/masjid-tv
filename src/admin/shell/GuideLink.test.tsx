// The admin's link to the public TV setup guide (/panduan): BM page by default, new tab.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { seoPage } from "@/seo/routes";
import { LangProvider } from "../i18n";
import ms from "../i18n/ms.json";
import { ROUTES } from "../routing";
import { GuideLink } from "./AdminShell";

describe("admin → Panduan link", () => {
  it("opens the BM guide in a new tab, with its label and a new-tab hint for screen readers", () => {
    const html = renderToStaticMarkup(
      <LangProvider>
        <GuideLink className="x" />
      </LangProvider>,
    );
    expect(html).toContain(`href="${ROUTES.guide}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
    expect(html).toContain(ms.nav.guide);
    expect(html).toContain(ms.nav.newTab);
  });

  it("both guide routes are real public pages", () => {
    expect(seoPage(ROUTES.guide).type).toBe("guide");
    expect(seoPage(ROUTES.guideEn).lang).toBe("en");
  });
});
