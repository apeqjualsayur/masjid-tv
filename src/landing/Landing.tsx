// Landing page (_specs/20-PRD-landing.md). One component for both languages. This step builds the
// header and footer; every section below exists (empty) so the #anchors already work.
import { Footer } from "./Footer";
import { Header } from "./Header";
import { outfit } from "./fonts";
import type { Lang } from "./i18n";

/** Sections in PRD §4 order. The ids in PRD §4 are the nav targets; the others name the rest. */
export const SECTIONS = ["hero", "angka", "banding", "ciri", "sehari", "panel", "templat", "cuba", "peranti", "tema", "cara", "soalan", "daftar"] as const;

export function Landing({ lang }: { lang: Lang }) {
  return (
    <div data-landing lang={lang} className={`${outfit.variable} min-h-screen bg-white font-outfit text-lb-ink antialiased`}>
      <Header lang={lang} />
      <main id="kandungan" tabIndex={-1} className="outline-none">
        {SECTIONS.map((id) => (
          <section key={id} id={id} data-section={id} />
        ))}
      </main>
      <Footer lang={lang} />
    </div>
  );
}