// Privacy notice (PRD §10) at /privasi (BM) and /en/privasi (EN): one language per URL, so each page has
// its own title, canonical and hreflang (_specs/70-PRD-seo.md §3.B). Text: src/content/privasi.ts (DRAFT).
// A server component: no client state; the BM | EN switch links to the other page.
import Link from "next/link";
import { ROUTES } from "@/admin/routing";
import { LogoMark } from "@/admin/shell/icons";
import { PRIVACY, UPDATED } from "@/content/privasi";
import type { Lang } from "./i18n";

export const privacyHref = (lang: Lang) => (lang === "en" ? "/en/privasi/" : "/privasi/");

export function PrivacyNotice({ lang }: { lang: Lang }) {
  const p = PRIVACY[lang];
  const [y, m, d] = UPDATED.split("-").map(Number);
  const updated = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(lang === "en" ? "en-MY" : "ms-MY", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const switchLink = (l: Lang, label: string) => (
    <a
      href={privacyHref(l)}
      hrefLang={l}
      lang={l}
      aria-current={l === lang ? "page" : undefined}
      className={`flex h-9 min-w-11 items-center justify-center rounded-full px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green ${l === lang ? "bg-white text-adm-ink shadow-[0_1px_2px_rgba(18,38,30,0.1)]" : "text-adm-muted hover:text-adm-ink"}`}
    >
      {label}
    </a>
  );
  return (
    <div className="fixed inset-0 overflow-y-auto bg-adm-ground font-jakarta text-adm-ink antialiased">
      <div className="mx-auto flex min-h-full w-full max-w-[680px] flex-col gap-5 px-5 pt-5 pb-12">
        <div className="flex items-center justify-between">
          <LogoMark size={40} />
          <div role="group" aria-label={lang === "en" ? "Language" : "Bahasa"} className="flex items-center rounded-full bg-[#E3ECE7] p-[3px] text-[13px] font-bold">
            {switchLink("ms", "BM")}
            {switchLink("en", "EN")}
          </div>
        </div>
        <p role="note" className="rounded-xl border border-adm-gold bg-[#FFF6E0] px-4 py-3 text-[14px] font-bold leading-[1.5] text-[#6B4A00]">
          {p.draft}
        </p>
        <h1 className="text-[28px] font-extrabold tracking-[-0.3px]">{p.title}</h1>
        <p className="text-[15px] leading-[1.6]">{p.intro}</p>
        {p.sections.map((s) => (
          <section key={s.heading} className="flex flex-col gap-2">
            <h2 className="text-[18px] font-extrabold">{s.heading}</h2>
            {s.body?.map((b) => (
              <p key={b} className="text-[15px] leading-[1.6]">{b}</p>
            ))}
            {s.list && (
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-[1.6]">
                {s.list.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <p className="text-[13px] text-adm-muted">
          {p.updated}: {updated}
        </p>
        <Link href={ROUTES.signIn} className="inline-flex min-h-11 items-center font-bold text-adm-green">
          ← {p.back}
        </Link>
      </div>
    </div>
  );
}
