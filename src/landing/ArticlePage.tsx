// One article (_specs/70-PRD-seo.md §3.E): breadcrumb Utama › Artikel › title, H1, dates, author,
// "Jawapan ringkas", body blocks, FAQ (<details>), CTA band, 3 related links. Landing header, footer and
// Lembut tokens; readable at 390 px (18 px body, lines ≤ ~70 characters).
import { articleBySlug, articlePath, type Article, type ArticleBlock } from "@/content/artikel";
import { DEMO_HREF } from "./Footer";
import { ADMIN_HREF } from "./Header";
import { copy, homeHref } from "./i18n";
import { JsonLd } from "./jsonld";
import { LandingShell } from "./LandingShell";
import { Rich } from "./rich";
import { focusRing } from "./sections";

export const ARTICLES_HREF = "/artikel/";

/** "5 Disember 2026" */
export function formatDateMs(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const measure = "max-w-[68ch]";
const h2 = "m-0 mt-4 text-[clamp(22px,2.6vw,28px)] leading-[1.25] font-bold tracking-[-0.3px]";

function Block({ b }: { b: ArticleBlock }) {
  switch (b.type) {
    case "heading":
      return <h2 className={h2}>{b.text}</h2>;
    case "paragraph":
      return (
        <p className="m-0">
          <Rich text={b.text} />
        </p>
      );
    case "list":
    case "ordered": {
      const Tag = b.type === "list" ? "ul" : "ol";
      return (
        <Tag className={`m-0 flex flex-col gap-2 pl-6 ${b.type === "list" ? "list-disc" : "list-decimal marker:font-bold marker:text-lb-deep"}`}>
          {b.items.map((it) => (
            <li key={it}>
              <Rich text={it} />
            </li>
          ))}
        </Tag>
      );
    }
    case "table":
      return (
        <div className="overflow-x-auto rounded-2xl border border-lb-line">
          <table className="w-full border-collapse text-left text-[16px]">
            {b.caption && <caption className="px-4 pt-3 text-left text-[14px] font-semibold text-lb-muted">{b.caption}</caption>}
            <thead>
              <tr>
                {b.head.map((h) => (
                  <th key={h} scope="col" className="border-b border-lb-line bg-lb-soft px-4 py-3 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i} className="border-b border-lb-hair last:border-0">
                  {r.map((c, j) => (
                    <td key={j} className="px-4 py-3 align-top">
                      <Rich text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout":
      return (
        <p role="note" className="m-0 rounded-2xl border border-lb-line bg-lb-ground px-5 py-4 text-[16px]">
          <Rich text={b.text} />
        </p>
      );
    case "cta":
      return (
        <p className="m-0 flex flex-wrap gap-3">
          {b.links.map((l, i) => (
            <a key={l.href} href={l.href} className={`flex min-h-11 items-center rounded-full px-5 text-[16px] font-semibold ${i === 0 ? "bg-lb-deep text-white hover:bg-lb-brand" : "border border-lb-line bg-white text-lb-deep"} ${focusRing}`}>
              {l.label}
            </a>
          ))}
        </p>
      );
    case "faq":
      return null; // rendered together at the end (one FAQ section per article)
  }
}

export function ArticlePage({ article: a }: { article: Article }) {
  const k = copy("ms").artikel;
  const faqs = a.blocks.flatMap((b) => (b.type === "faq" ? b.items : []));
  const related = a.related.map((s) => articleBySlug(s)).filter((r): r is Article => !!r && !r.draft).slice(0, 3);
  const crumb = `rounded hover:text-lb-ink ${focusRing}`;
  return (
    <LandingShell lang="ms" page="artikel">
      <JsonLd path={articlePath(a.slug)} />
      <article className="mx-auto flex max-w-[760px] flex-col gap-6 px-5 py-[clamp(32px,5vw,64px)] text-[18px] leading-[1.7]">
        <nav aria-label="Breadcrumb" className="text-[14px] text-lb-muted">
          <ol className="m-0 flex flex-wrap items-center gap-1.5 p-0">
            <li><a href={homeHref("ms")} className={crumb}>{copy("ms").seo.breadcrumbHome}</a></li>
            <li aria-hidden="true">›</li>
            <li><a href={ARTICLES_HREF} className={crumb}>{k.breadcrumb}</a></li>
            <li aria-hidden="true">›</li>
            <li aria-current="page" className="text-lb-ink">{a.title}</li>
          </ol>
        </nav>
        <header className="flex flex-col gap-3">
          <h1 className="m-0 text-[clamp(30px,4vw,44px)] leading-[1.15] font-bold tracking-[-0.8px]">{a.title}</h1>
          <p className="m-0 text-[14px] text-lb-muted">
            {k.by} {k.author} · {k.published} <time dateTime={a.datePublished}>{formatDateMs(a.datePublished)}</time>
            {a.dateModified !== a.datePublished && (
              <>
                {" "}· {k.updated} <time dateTime={a.dateModified}>{formatDateMs(a.dateModified)}</time>
              </>
            )}
          </p>
        </header>
        <aside aria-labelledby="jawapan-ringkas" className="rounded-2xl border-l-4 border-lb-deep bg-lb-soft px-5 py-4">
          <h2 id="jawapan-ringkas" className="m-0 text-[14px] font-bold tracking-[0.1em] text-lb-deep uppercase">
            {k.summary}
          </h2>
          <p className={`m-0 mt-1.5 ${measure}`}>{a.summary}</p>
        </aside>
        <div className={`flex flex-col gap-5 ${measure}`}>
          {a.blocks.map((b, i) => (
            <Block key={i} b={b} />
          ))}
        </div>
        {faqs.length > 0 && (
          <section aria-labelledby="soalan-lazim" className={`flex flex-col gap-3 ${measure}`}>
            <h2 id="soalan-lazim" className={h2}>{k.faq}</h2>
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-lb-hair bg-lb-card">
                <summary className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden ${focusRing}`}>
                  <span>{f.q}</span>
                  <span aria-hidden="true" className="flex-none text-[22px] leading-none text-lb-primary group-open:rotate-45">+</span>
                </summary>
                <p className="m-0 px-5 pb-4 text-[17px] text-lb-muted">
                  <Rich text={f.a} />
                </p>
              </details>
            ))}
          </section>
        )}
        <section aria-labelledby="cuba-mv" className="flex flex-col gap-3 rounded-3xl bg-lb-deep px-6 py-7 text-white">
          <h2 id="cuba-mv" className="m-0 text-[24px] font-bold">{k.cta.title}</h2>
          <p className="m-0 text-[17px] text-white/85">{k.cta.body}</p>
          <p className="m-0 flex flex-wrap gap-3">
            <a href={DEMO_HREF} className="flex min-h-11 items-center rounded-full bg-white px-5 font-semibold text-lb-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{k.cta.demo}</a>
            <a href={ADMIN_HREF} className="flex min-h-11 items-center rounded-full border border-white/60 px-5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{k.cta.signup}</a>
          </p>
        </section>
        {related.length > 0 && (
          <section aria-labelledby="berkaitan" className="flex flex-col gap-3">
            <h2 id="berkaitan" className={h2}>{k.related}</h2>
            <ul className="m-0 flex flex-col gap-2 p-0">
              {related.map((r) => (
                <li key={r.slug} className="list-none">
                  <a href={articlePath(r.slug)} className={`font-semibold text-lb-deep underline underline-offset-2 ${focusRing}`}>{r.title}</a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </LandingShell>
  );
}
