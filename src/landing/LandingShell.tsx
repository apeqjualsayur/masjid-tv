// Page frame shared by the landing page and /panduan: fonts, palette, scroll mode, header, footer.
import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { outfit } from "./fonts";
import type { Lang, Page } from "./i18n";

export function LandingShell({ lang, page, children }: { lang: Lang; page: Page; children: ReactNode }) {
  return (
    <div data-landing lang={lang} className={`${outfit.variable} min-h-screen bg-white font-outfit text-lb-ink antialiased`}>
      <Header lang={lang} page={page} />
      <main id="kandungan" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer lang={lang} page={page} />
    </div>
  );
}