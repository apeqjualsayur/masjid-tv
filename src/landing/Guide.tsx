// /panduan and /en/panduan (PRD §7): short TV setup guide, same header and footer as the landing page.
// Screenshot slots read public/panduan/*.png; a missing file is left out (checked at build time,
// this is a static page) and the text stays.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { LandingShell } from "./LandingShell";
import { copy, homeHref, pageHref, type Lang } from "./i18n";
import { JsonLd } from "./jsonld";
import { guideSections } from "./guide-content";
import { seoPage } from "@/seo/routes";
import { Eyebrow, focusRing, h2Class } from "./sections";
import { site } from "./site";

const hasImage = (file: string) => existsSync(join(process.cwd(), "public", "panduan", file));

export function Guide({ lang }: { lang: Lang }) {
  const g = copy(lang).panduan;
  const sections = guideSections(lang);
  const all = [...sections.map((s) => ({ id: s.id, title: s.title })), { id: g.trouble.id, title: g.trouble.title }];
  // "Dikemas kini": the page's content date from the SEO registry (the same date as the sitemap lastmod).
  const updatedIso = seoPage(pageHref(lang, "panduan")).updated;
  const [y, m, d] = updatedIso.split("-").map(Number);
  const updated = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(lang === "en" ? "en-MY" : "ms-MY", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <LandingShell lang={lang} page="panduan">
      <JsonLd path={pageHref(lang, "panduan")} />
      <article className="mx-auto flex max-w-[860px] flex-col gap-10 px-5 py-[clamp(40px,6vw,72px)]">
        <header className="flex flex-col gap-4">
          <Eyebrow>{g.eyebrow}</Eyebrow>
          <h1 className="m-0 text-[clamp(32px,4vw,48px)] leading-[1.1] font-bold tracking-[-1px]">{g.title}</h1>
          <p className="m-0 text-[14px] text-lb-muted">
            {g.updated}: <time dateTime={updatedIso}>{updated}</time>
          </p>
          <p className="m-0 text-[18px] leading-[1.65] text-lb-muted">{g.intro}</p>
          <p className="m-0 rounded-2xl border border-lb-line bg-lb-ground px-5 py-4 text-[15px] leading-[1.6]">{g.before}</p>
          <nav aria-labelledby="panduan-toc" className="flex flex-col gap-2">
            <h2 id="panduan-toc" className="m-0 text-[14px] font-bold tracking-[0.08em] text-lb-muted uppercase">
              {g.toc}
            </h2>
            <ol className="flex flex-wrap gap-2">
              {all.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className={`inline-flex min-h-11 items-center rounded-full border border-lb-line bg-white px-4 text-[14px] font-semibold hover:border-lb-primary ${focusRing}`}>
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </header>

        {sections.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="flex flex-col gap-4 border-t border-lb-hair pt-8">
            <h2 id={`${s.id}-title`} className={`${h2Class} flex items-baseline gap-3 text-[clamp(24px,2.6vw,30px)]`}>
              <span aria-hidden="true" className="text-lb-primary">{i + 1}{" "}</span>
              {s.title}
            </h2>
            <p className="m-0 text-[17px] leading-[1.6] font-medium">{s.lead}</p>
            <ol className="flex list-decimal flex-col gap-2.5 pl-6 text-[16px] leading-[1.65] marker:font-bold marker:text-lb-deep">
              {s.steps.map((st) => (
                <li key={st}>{st}</li>
              ))}
            </ol>
            {s.note && <p className="m-0 rounded-2xl border border-lb-line bg-lb-ground px-5 py-3 text-[15px] leading-[1.6]">{s.note}</p>}
            {hasImage(s.img.file) && (
              <img src={`/panduan/${s.img.file}`} alt={s.img.alt} loading="lazy" className="w-full rounded-2xl border border-lb-line" />
            )}
          </section>
        ))}

        <section id={g.trouble.id} aria-labelledby="masalah-title" className="flex flex-col gap-4 border-t border-lb-hair pt-8">
          <h2 id="masalah-title" className={`${h2Class} text-[clamp(24px,2.6vw,30px)]`}>
            <span aria-hidden="true" className="mr-3 text-lb-primary">{all.length}{" "}</span>
            {g.trouble.title}
          </h2>
          <p className="m-0 text-[17px] leading-[1.6] font-medium">{g.trouble.lead}</p>
          <dl className="flex flex-col gap-3">
            {g.trouble.items.map((t) => (
              <div key={t.q} className="rounded-2xl border border-lb-hair bg-lb-card px-5 py-4">
                <dt className="text-[16px] font-bold">{t.q}</dt>
                <dd className="m-0 mt-1 text-[15px] leading-[1.6] text-lb-muted">{t.a}</dd>
              </div>
            ))}
          </dl>
          {site.contactEmail && (
            <p className="m-0 text-[15px]">
              {g.help}{" "}
              <a href={`mailto:${site.contactEmail}`} className={`rounded font-semibold text-lb-deep underline underline-offset-2 ${focusRing}`}>
                {site.contactEmail}
              </a>
            </p>
          )}
        </section>

        <a href={homeHref(lang)} className={`self-start rounded text-[16px] font-bold text-lb-deep ${focusRing}`}>
          {g.back}
        </a>
      </article>
    </LandingShell>
  );
}