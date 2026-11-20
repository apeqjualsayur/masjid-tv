// /artikel (_specs/70-PRD-seo.md §3.E): H1, one-line intro, published articles newest first (title,
// summary, date), or the empty state. Drafts never appear. RSS link in the head (src/seo/metadata.ts).
import { articlePath, publishedArticles } from "@/content/artikel";
import { FEED_PATH } from "@/seo/site";
import { ARTICLES_HREF, formatDateMs } from "./ArticlePage";
import { copy } from "./i18n";
import { JsonLd } from "./jsonld";
import { LandingShell } from "./LandingShell";
import { Eyebrow, focusRing } from "./sections";

export function ArticlesIndex() {
  const k = copy("ms").artikel;
  const list = publishedArticles();
  return (
    <LandingShell lang="ms" page="artikel">
      <JsonLd path={ARTICLES_HREF} />
      <div className="mx-auto flex max-w-[860px] flex-col gap-8 px-5 py-[clamp(40px,6vw,72px)]">
        <header className="flex flex-col gap-3">
          <Eyebrow>MASJID VIEW</Eyebrow>
          <h1 className="m-0 text-[clamp(32px,4vw,48px)] leading-[1.1] font-bold tracking-[-1px]">{k.title}</h1>
          <p className="m-0 max-w-[62ch] text-[18px] leading-[1.65] text-lb-muted">{k.intro}</p>
        </header>
        {list.length === 0 ? (
          <p data-empty className="m-0 rounded-2xl border border-lb-line bg-lb-ground px-5 py-6 text-[17px]">{k.empty}</p>
        ) : (
          <ul className="m-0 flex flex-col gap-4 p-0">
            {list.map((a) => (
              <li key={a.slug} className="list-none">
                <article className="flex flex-col gap-2 rounded-[20px] border border-lb-line bg-white p-6">
                  <p className="m-0 text-[14px] text-lb-muted">
                    <time dateTime={a.datePublished}>{formatDateMs(a.datePublished)}</time>
                  </p>
                  <h2 className="m-0 text-[22px] leading-[1.3] font-bold">
                    <a href={articlePath(a.slug)} className={`rounded hover:text-lb-deep ${focusRing}`}>{a.title}</a>
                  </h2>
                  <p className="m-0 line-clamp-3 text-[16px] leading-[1.6] text-lb-muted">{a.summary}</p>
                </article>
              </li>
            ))}
          </ul>
        )}
        <a href={FEED_PATH} className={`self-start rounded text-[15px] font-semibold text-lb-deep underline underline-offset-2 ${focusRing}`}>
          {k.feed}
        </a>
      </div>
    </LandingShell>
  );
}
