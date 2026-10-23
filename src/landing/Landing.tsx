// Landing page (_specs/20-PRD-landing.md). One component for both languages; all sections in PRD §4
// order (row 13 "Kenapa percuma" was removed from the PRD).
import { Hero } from "./Hero";
import { Numbers } from "./Numbers";
import { Compare, CtaBand, Faq, Features, Steps } from "./sections";
import { JsonLd } from "./jsonld";
import { DaySection, TemplatesSection, ThemesSection } from "./showcase";
import { DevicesSection, PanelSection } from "./illustrations";
import { TrySection } from "./try";
import { LandingShell } from "./LandingShell";
import type { Lang } from "./i18n";

/** Section ids in page order. The ids in PRD §4 are the nav targets; the others name the rest. */
export const SECTIONS = ["hero", "angka", "banding", "ciri", "sehari", "panel", "templat", "cuba", "peranti", "tema", "cara", "soalan", "daftar"] as const;

export function Landing({ lang }: { lang: Lang }) {
  return (
    <LandingShell lang={lang} page="home">
      <JsonLd lang={lang} />
      <Hero lang={lang} />
      <Numbers lang={lang} />
      <Compare lang={lang} />
      <Features lang={lang} />
      <DaySection lang={lang} />
      <PanelSection lang={lang} />
      <TemplatesSection lang={lang} />
      <TrySection lang={lang} />
      <DevicesSection lang={lang} />
      <ThemesSection lang={lang} />
      <Steps lang={lang} />
      <Faq lang={lang} />
      <CtaBand lang={lang} />
    </LandingShell>
  );
}