// Landing footer (PRD §4 row 16): white lockup, tagline, Produk / Bantuan / Hubungi, credit line.
// Contact rows come from site.ts; an empty value hides its row (no placeholders).
import type { ReactNode } from "react";
import { copy, sectionHref, type Lang, type Page } from "./i18n";
import { site } from "./site";

export const DEMO_HREF = "/tv/?demo=1";
export const PRIVACY_HREF = "/privasi/";
export const guideHref = (lang: Lang) => (lang === "en" ? "/en/panduan/" : "/panduan/");

const link = "rounded hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="text-[14px] font-bold text-white">{title}</h2>
      <ul className="flex flex-col gap-2.5">{children}</ul>
    </div>
  );
}

export function Footer({ lang, page = "home" }: { lang: Lang; page?: Page }) {
  const c = copy(lang);
  const f = c.footer;
  const year = new Date().getFullYear();
  const wa = site.whatsapp.replace(/\D/g, "");
  return (
    <footer className="bg-lb-ink text-white/75">
      <nav aria-label={c.a11y.footerNav} className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-7 px-5 pt-12 pb-7 text-[14px]">
        <div className="flex flex-col gap-3">
          <img src="/brand/mv-lockup-white.svg" alt="Masjid View" width={141} height={32} className="h-8 w-auto self-start" />
          <p className="leading-[1.6]">{f.tagline}</p>
        </div>
        <Column title={f.product}>
          <li><a className={link} href={sectionHref(lang, page, "ciri")}>{f.productFeatures}</a></li>
          <li><a className={link} href={sectionHref(lang, page, "panel")}>{f.productPanel}</a></li>
          <li>
            <a className={link} href={DEMO_HREF} target="_blank" rel="noopener">
              {f.productDemo}
              <span className="sr-only"> {c.a11y.newTab}</span>
            </a>
          </li>
        </Column>
        <Column title={f.help}>
          <li><a className={link} href={guideHref(lang)}>{f.helpGuide}</a></li>
          <li><a className={link} href={sectionHref(lang, page, "soalan")}>{f.helpFaq}</a></li>
          <li><a className={link} href={PRIVACY_HREF}>{f.helpPrivacy}</a></li>
          {site.supportUrl && (
            <li><a className={link} href={site.supportUrl} rel="noopener">{f.support}</a></li>
          )}
        </Column>
        <Column title={f.contact}>
          {site.contactEmail && (
            <li><a className={`${link} break-all`} href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></li>
          )}
          {wa && (
            <li><a className={link} href={`https://wa.me/${wa}`} target="_blank" rel="noopener">{f.whatsapp} {site.whatsapp}</a></li>
          )}
        </Column>
      </nav>
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-3 border-t border-white/12 px-5 pt-[18px] pb-7 text-[13px] text-white/60">
        <p>© {year} Masjid View{site.credit ? ` · ${site.credit}` : ""}</p>
        <p>{f.jakim}</p>
      </div>
    </footer>
  );
}