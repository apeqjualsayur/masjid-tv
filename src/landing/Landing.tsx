// Landing page (_specs/20-PRD-landing.md). One component for both languages. This step builds the
// sections in PRD §4 order; the ones not built yet are empty so the #anchors already work.
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { Numbers } from "./Numbers";
import { Compare, Features, Steps } from "./sections";
import { DaySection, TemplatesSection, ThemesSection } from "./showcase";
import { outfit } from "./fonts";
import type { Lang } from "./i18n";

/** Sections in PRD §4 order. The ids in PRD §4 are the nav targets; the others name the rest. */
export const SECTIONS = ["hero", "angka", "banding", "ciri", "sehari", "panel", "templat", "cuba", "peranti", "tema", "cara", "soalan", "daftar"] as const;

export function Landing({ lang }: { lang: Lang }) {
  return (
    <div data-landing lang={lang} className={`${outfit.variable} min-h-screen bg-white font-outfit text-lb-ink antialiased`}>
      <Header lang={lang} />
      <main id="kandungan" tabIndex={-1} className="outline-none">
        <Hero lang={lang} />
        <Numbers lang={lang} />
        <Compare lang={lang} />
        <Features lang={lang} />
        <DaySection lang={lang} />
        <section id="panel" data-section="panel" />
        <TemplatesSection lang={lang} />
        <section id="cuba" data-section="cuba" />
        <section id="peranti" data-section="peranti" />
        <ThemesSection lang={lang} />
        <Steps lang={lang} />
        <section id="soalan" data-section="soalan" />
        <section id="daftar" data-section="daftar" />
      </main>
      <Footer lang={lang} />
    </div>
  );
}