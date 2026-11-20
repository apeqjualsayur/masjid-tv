// /templat (_specs/70-PRD-seo.md §3.F): every template the picker offers, a card each with a small REAL
// render (poster layout, mounted on scroll), its name and description, linking to its page.
import { templatePages, templatePath } from "@/content/templat";
import { TEMPLATES } from "@/templates/schema";
import { TEMPLAT_HREF } from "./TemplatePage";
import { copy, homeHref } from "./i18n";
import { JsonLd } from "./jsonld";
import { LandingShell } from "./LandingShell";
import { Eyebrow, focusRing } from "./sections";
import { TemplateRender } from "./TemplateRender";

export function TemplatesGallery() {
  const k = copy("ms").templat;
  return (
    <LandingShell lang="ms" page="templat">
      <JsonLd path={TEMPLAT_HREF} />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-[clamp(40px,6vw,72px)]">
        <nav aria-label="Breadcrumb" className="text-[14px] text-lb-muted">
          <ol className="m-0 flex flex-wrap items-center gap-1.5 p-0">
            <li><a href={homeHref("ms")} className={`rounded hover:text-lb-ink ${focusRing}`}>{copy("ms").seo.breadcrumbHome}</a></li>
            <li aria-hidden="true">›</li>
            <li aria-current="page" className="text-lb-ink">{k.breadcrumb}</li>
          </ol>
        </nav>
        <header className="flex flex-col gap-3">
          <Eyebrow>MASJID VIEW</Eyebrow>
          <h1 className="m-0 text-[clamp(32px,4vw,48px)] leading-[1.1] font-bold tracking-[-1px]">{k.title}</h1>
          <p className="m-0 max-w-[62ch] text-[18px] leading-[1.65] text-lb-muted">{k.intro}</p>
        </header>
        <ul className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-4 p-0">
          {templatePages().map((p) => (
            <li key={p.slug} className="list-none">
              <a href={templatePath(p.slug)} className={`flex h-full flex-col gap-3 rounded-[20px] border border-lb-line bg-white p-4 hover:border-lb-primary ${focusRing}`}>
                <TemplateRender k={p.key} layout="poster" label={TEMPLATES[p.key].name.ms} small />
                <span className="flex flex-col gap-1">
                  <span className="text-[18px] font-bold">{TEMPLATES[p.key].name.ms}</span>
                  <span className="text-[15px] leading-[1.5] text-lb-muted">{TEMPLATES[p.key].desc.ms}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </LandingShell>
  );
}
