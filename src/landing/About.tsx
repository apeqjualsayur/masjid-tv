// /tentang and /en/tentang (_specs/70-PRD-seo.md §3.D): what Masjid View is, why, who builds it (decision
// D1: the brand only, "Hamba Allah"), funding, where prayer times come from, privacy, contact. All copy
// from the landing i18n (tentang); the contact e-mail and social links from site.ts.
import { LandingShell } from "./LandingShell";
import { copy, homeHref, pageHref, type Lang } from "./i18n";
import { JsonLd } from "./jsonld";
import { privacyHref } from "./PrivacyNotice";
import { Eyebrow, focusRing, h2Class } from "./sections";
import { site } from "./site";
import { SocialLinks } from "./social";

const linkClass = `rounded font-semibold text-lb-deep underline underline-offset-2 ${focusRing}`;

/** The privacy section names the notice: link that phrase to /privasi (same as the FAQ does). */
function WithPrivacyLink({ text, lang }: { text: string; lang: Lang }) {
  const phrase = copy(lang).footer.helpPrivacy;
  const at = text.indexOf(phrase);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <a href={privacyHref(lang)} className={linkClass}>
        {phrase}
      </a>
      {text.slice(at + phrase.length)}
    </>
  );
}

export function About({ lang }: { lang: Lang }) {
  const c = copy(lang);
  const k = c.tentang;
  return (
    <LandingShell lang={lang} page="tentang">
      <JsonLd path={pageHref(lang, "tentang")} />
      <article className="mx-auto flex max-w-[760px] flex-col gap-8 px-5 py-[clamp(40px,6vw,72px)]">
        <header className="flex flex-col gap-4">
          <Eyebrow>{c.footer.helpAbout.toUpperCase()}</Eyebrow>
          <h1 className="m-0 text-[clamp(32px,4vw,48px)] leading-[1.1] font-bold tracking-[-1px]">{k.title}</h1>
          <p className="m-0 text-[18px] leading-[1.65] text-lb-muted">{k.intro}</p>
        </header>
        {k.sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="flex flex-col gap-3 border-t border-lb-hair pt-6">
            <h2 id={`${s.id}-title`} className={`${h2Class} text-[clamp(22px,2.4vw,28px)]`}>
              {s.heading}
            </h2>
            <p className="m-0 text-[16px] leading-[1.7]">{s.id === "privasi" ? <WithPrivacyLink text={s.body} lang={lang} /> : s.body}</p>
          </section>
        ))}
        <section id="hubungi" aria-labelledby="hubungi-title" className="flex flex-col gap-3 border-t border-lb-hair pt-6">
          <h2 id="hubungi-title" className={`${h2Class} text-[clamp(22px,2.4vw,28px)]`}>
            {k.contact.heading}
          </h2>
          <p className="m-0 text-[16px] leading-[1.7]">
            {k.contact.before}{" "}
            {site.contactEmail && (
              <a href={`mailto:${site.contactEmail}`} className={`${linkClass} break-all`}>
                {site.contactEmail}
              </a>
            )}
            {k.contact.after}
          </p>
          <SocialLinks lang={lang} className="flex flex-wrap gap-3" linkClass={`inline-flex min-h-11 items-center gap-2 rounded-full border border-lb-line bg-white px-4 text-[15px] font-semibold ${focusRing}`} />
        </section>
        <a href={homeHref(lang)} className={`self-start rounded text-[16px] font-bold text-lb-deep ${focusRing}`}>
          {c.panduan.back}
        </a>
      </article>
    </LandingShell>
  );
}
