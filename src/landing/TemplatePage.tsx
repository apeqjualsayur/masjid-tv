// One template page, /templat/<slug>/ (_specs/70-PRD-seo.md §3.F): breadcrumb, H1, answer-first intro,
// when to use it, REAL renders (Tenang, poster 16:9 + bottom 12:5), how it shows, the fields from the
// template schema, tips, CTA "Guna templat ini", related templates and articles. Kematian: grey only,
// no accent colour, no decoration (theme contract rule 7, applied to the page as well).
import { articleBySlug, articlePath } from "@/content/artikel";
import { TEMPLATE_PAGES, templatePath, type TemplatePage as Page } from "@/content/templat";
import { TEMPLATES } from "@/templates/schema";
import { ADMIN_HREF } from "./Header";
import { copy, homeHref } from "./i18n";
import { JsonLd } from "./jsonld";
import { LandingShell } from "./LandingShell";
import { focusRing } from "./sections";
import { TemplateRender } from "./TemplateRender";

export const TEMPLAT_HREF = "/templat/";
const h2 = "m-0 text-[clamp(22px,2.6vw,28px)] leading-[1.25] font-bold tracking-[-0.3px]";

export function TemplatePage({ page: p }: { page: Page }) {
  const k = copy("ms").templat;
  const sober = p.key === "kematian";
  const meta = TEMPLATES[p.key];
  const accent = sober ? "text-[#3A3A3A]" : "text-lb-deep";
  const related = p.relatedTemplates.map((r) => TEMPLATE_PAGES[r]);
  const articles = p.relatedArticles.map((s) => articleBySlug(s)).filter((a) => a && !a.draft);
  const crumb = `rounded hover:text-lb-ink ${focusRing}`;
  return (
    <LandingShell lang="ms" page="templat">
      <JsonLd path={templatePath(p.slug)} />
      <article className="mx-auto flex max-w-[860px] flex-col gap-7 px-5 py-[clamp(32px,5vw,64px)] text-[18px] leading-[1.7]">
        <nav aria-label="Breadcrumb" className="text-[14px] text-lb-muted">
          <ol className="m-0 flex flex-wrap items-center gap-1.5 p-0">
            <li><a href={homeHref("ms")} className={crumb}>{copy("ms").seo.breadcrumbHome}</a></li>
            <li aria-hidden="true">›</li>
            <li><a href={TEMPLAT_HREF} className={crumb}>{k.breadcrumb}</a></li>
            <li aria-hidden="true">›</li>
            <li aria-current="page" className="text-lb-ink">{meta.name.ms}</li>
          </ol>
        </nav>
        <header className="flex flex-col gap-3">
          <h1 className="m-0 text-[clamp(30px,4vw,44px)] leading-[1.15] font-bold tracking-[-0.8px]">{p.h1}</h1>
          <p className="m-0 max-w-[68ch] text-[19px] leading-[1.65] text-lb-muted">{p.intro}</p>
        </header>
        <section aria-labelledby="bila" className="flex max-w-[68ch] flex-col gap-2">
          <h2 id="bila" className={h2}>{k.whenTitle}</h2>
          <p className="m-0">{p.when}</p>
        </section>
        <figure className="m-0 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(["poster", "bottom"] as const).map((layout) => {
              const label = layout === "poster" ? k.renderPoster : k.renderBottom;
              return (
                <div key={layout} className="flex flex-col gap-1.5">
                  <TemplateRender k={p.key} layout={layout} label={`${meta.name.ms}: ${label}`} small />
                  <span className="text-[14px] font-semibold text-lb-muted">{label}</span>
                </div>
              );
            })}
          </div>
          <figcaption className="text-[14px] text-lb-muted">{p.render === "layout" ? k.ayatNote : k.renderNote}</figcaption>
        </figure>
        <section aria-labelledby="paparan" className="flex max-w-[68ch] flex-col gap-2">
          <h2 id="paparan" className={h2}>{k.displayTitle}</h2>
          <p className="m-0">{p.display}</p>
        </section>
        <section aria-labelledby="medan" className="flex max-w-[68ch] flex-col gap-2">
          <h2 id="medan" className={h2}>{k.fieldsTitle}</h2>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-6">
            {meta.fields.map((f) => (
              <li key={f.key}>
                {f.label.ms}
                {f.required && <span className={`font-bold ${accent}`}> *</span>}
              </li>
            ))}
          </ul>
          <p className="m-0 text-[16px] text-lb-muted">{p.fieldsNote}</p>
        </section>
        <section aria-labelledby="tip" className="flex max-w-[68ch] flex-col gap-2">
          <h2 id="tip" className={h2}>{k.tipsTitle}</h2>
          <ul className="m-0 flex list-disc flex-col gap-2 pl-6">
            {p.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="guna" className={`flex flex-col gap-3 rounded-3xl px-6 py-7 ${sober ? "bg-[#F1F1F1] text-[#2A2A2A]" : "bg-lb-deep text-white"}`}>
          <h2 id="guna" className="m-0 text-[24px] font-bold">{k.cta}</h2>
          <p className={`m-0 text-[17px] ${sober ? "text-[#555]" : "text-white/85"}`}>{k.ctaBody}</p>
          <a href={ADMIN_HREF} className={`flex min-h-11 items-center self-start rounded-full px-5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${sober ? "bg-[#3A3A3A] text-white focus-visible:outline-[#3A3A3A]" : "bg-white text-lb-deep focus-visible:outline-white"}`}>
            {k.cta}
          </a>
        </section>
        <section aria-labelledby="berkaitan" className="flex flex-col gap-2">
          <h2 id="berkaitan" className={h2}>{k.relatedTitle}</h2>
          <ul className="m-0 flex flex-wrap gap-2 p-0">
            {related.map((r) => (
              <li key={r.slug} className="list-none">
                <a href={templatePath(r.slug)} className={`flex min-h-11 items-center rounded-full border border-lb-line bg-white px-4 text-[16px] font-semibold ${accent} ${focusRing}`}>
                  {TEMPLATES[r.key].name.ms}
                </a>
              </li>
            ))}
          </ul>
          {articles.length > 0 && (
            <>
              <h3 className="m-0 mt-3 text-[18px] font-bold">{k.articlesTitle}</h3>
              <ul className="m-0 flex flex-col gap-1.5 pl-6">
                {articles.map((a) => (
                  <li key={a!.slug}>
                    <a href={articlePath(a!.slug)} className={`font-semibold underline underline-offset-2 ${accent} ${focusRing}`}>{a!.title}</a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </article>
    </LandingShell>
  );
}
