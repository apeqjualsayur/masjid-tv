// Plain landing sections (no theme renders): 4 Sebelum / Dengan, 5 Ciri-ciri, 12 Cara bermula.
// All copy from the i18n json.
import type { ReactNode } from "react";
import { DEMO_HREF, PRIVACY_HREF } from "./Footer";
import { ADMIN_HREF } from "./Header";
import { copy, type Lang } from "./i18n";
import { FEATURE_ICONS, LineIcon } from "./icons";

export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lb-deep";
export const sectionPad = "py-[clamp(64px,8vw,100px)]";
export const h2Class = "m-0 text-[clamp(28px,3.2vw,38px)] font-bold tracking-[-0.6px]";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="m-0 text-[14px] font-bold tracking-[0.14em] text-lb-primary">{children}</p>;
}

/** Centred eyebrow + heading + optional line, used by most sections. */
export function SectionHead({ id, eyebrow, title, body }: { id: string; eyebrow?: string; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 id={id} className={h2Class}>
        {title}
      </h2>
      {body && <p className="m-0 max-w-[620px] text-[17px] leading-[1.6] text-lb-muted">{body}</p>}
    </div>
  );
}

const CROSS = "M6 6l12 12 M18 6 6 18";
const TICK = "M5 12l5 5L20 7";

export function Compare({ lang }: { lang: Lang }) {
  const k = copy(lang).compare;
  return (
    <section id="banding" aria-label={`${k.before} / ${k.after}`} className={sectionPad}>
      <div className="mx-auto grid max-w-[1000px] grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5 px-5">
        <div className="flex flex-col gap-3.5 rounded-[22px] bg-lb-warm p-7">
          <h2 className="m-0 text-[15px] font-bold text-lb-warm-title">{k.before}</h2>
          <ul className="flex flex-col gap-3.5">
            {k.beforeItems.map((b) => (
              <li key={b} className="flex gap-3 text-[16px] leading-[1.5] text-lb-warm-ink">
                <LineIcon d={CROSS} strokeWidth={2.2} className="mt-0.5 flex-none text-lb-warm-icon" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3.5 rounded-[22px] bg-lb-soft p-7">
          <h2 className="m-0 text-[15px] font-bold text-lb-deep">{k.after}</h2>
          <ul className="flex flex-col gap-3.5">
            {k.afterItems.map((a) => (
              <li key={a} className="flex gap-3 text-[16px] leading-[1.5]">
                <LineIcon d={TICK} strokeWidth={2.4} className="mt-0.5 flex-none text-lb-primary" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Features({ lang }: { lang: Lang }) {
  const c = copy(lang);
  const f = c.features;
  return (
    <section id="ciri" aria-labelledby="ciri-title" className="pb-[clamp(64px,8vw,100px)]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-12 px-5">
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
          <Eyebrow>{f.eyebrow}</Eyebrow>
          <h2 id="ciri-title" className={`${h2Class} leading-[1.2]`}>
            {f.title}
          </h2>
          <p className="m-0 text-[17px] leading-[1.6] text-lb-muted">{f.body}</p>
          <div className="flex flex-wrap gap-3">
            <a href={ADMIN_HREF} className={`flex h-[46px] items-center rounded-[10px] bg-lb-primary px-5 text-[15px] font-semibold text-white hover:bg-lb-deep ${focusRing}`}>
              {f.signup}
            </a>
            <a href={DEMO_HREF} target="_blank" rel="noopener" className={`flex h-[46px] items-center rounded-[10px] px-3 text-[15px] font-semibold hover:text-lb-deep ${focusRing}`}>
              {f.demo}
              <span className="sr-only"> {c.a11y.newTab}</span>
            </a>
          </div>
        </div>
        <ul className="grid min-w-0 flex-[1.4_1_520px] grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] gap-4">
          {f.items.map((it, i) => (
            <li key={it.t} className="flex gap-3.5 rounded-[18px] border border-lb-hair bg-lb-card p-[22px]">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-lb-soft text-lb-deep">
                <LineIcon d={FEATURE_ICONS[i]} />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="m-0 text-[17px] font-bold">{it.t}</h3>
                <p className="m-0 text-[14px] leading-[1.6] text-lb-muted">{it.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Steps({ lang }: { lang: Lang }) {
  const k = copy(lang).start;
  return (
    <section id="cara" aria-labelledby="cara-title" className={`bg-lb-ground ${sectionPad}`}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-9 px-5">
        <SectionHead id="cara-title" eyebrow={k.eyebrow} title={k.title} />
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-4">
          {k.steps.map((s, i) => (
            <li key={s.t} className="flex flex-col gap-3 rounded-[20px] border border-lb-line bg-white p-6">
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-lb-primary text-[16px] font-bold text-white">
                {i + 1}
              </span>
              <h3 className="m-0 text-[18px] font-bold">{s.t}</h3>
              <p className="m-0 text-[14px] leading-[1.6] text-lb-muted">{s.d}</p>
            </li>
          ))}
        </ol>
        <p className="m-0 flex flex-wrap justify-center gap-x-7 gap-y-3 text-center text-[15px] text-lb-muted">
          <span className="font-bold text-lb-ink">{k.needLabel}</span>
          {k.needs.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </p>
      </div>
    </section>
  );
}
/** 14 Soalan lazim: native <details> (keyboard: Tab to the question, Enter/Space toggles). First one open. */
export function Faq({ lang }: { lang: Lang }) {
  const k = copy(lang).faq;
  return (
    <section id="soalan" aria-labelledby="soalan-title" className="pb-[clamp(64px,8vw,100px)]">
      <div className="mx-auto flex max-w-[860px] flex-col gap-7 px-5">
        <h2 id="soalan-title" className={`${h2Class} text-center`}>
          {k.title}
        </h2>
        <div className="flex flex-col gap-2.5">
          {k.items.map((it, i) => (
            <details key={it.q} open={i === 0} className="group rounded-2xl border border-lb-hair bg-lb-card">
              <summary
                className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-[22px] py-[18px] text-[17px] font-semibold hover:text-lb-deep [&::-webkit-details-marker]:hidden ${focusRing}`}
              >
                <span>{it.q}</span>
                <span aria-hidden="true" className="flex-none text-[22px] leading-none text-lb-primary group-open:rotate-45 motion-safe:transition-transform motion-safe:duration-200">
                  +
                </span>
              </summary>
              <p className="m-0 px-[22px] pb-[18px] text-[15px] leading-[1.65] text-lb-muted">
                {i === k.items.length - 1 ? <PrivacyAnswer text={it.a} lang={lang} /> : it.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The last answer names the privacy notice: link that phrase to /privasi. */
function PrivacyAnswer({ text, lang }: { text: string; lang: Lang }) {
  const phrase = copy(lang).footer.helpPrivacy;
  const at = text.indexOf(phrase);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <a href={PRIVACY_HREF} className={`rounded font-semibold text-lb-deep underline underline-offset-2 ${focusRing}`}>
        {phrase}
      </a>
      {text.slice(at + phrase.length)}
    </>
  );
}

/** 15 CTA band (#daftar). */
export function CtaBand({ lang }: { lang: Lang }) {
  const c = copy(lang);
  const k = c.cta;
  const white = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
  return (
    <section id="daftar" aria-labelledby="daftar-title" className="pb-[clamp(64px,8vw,100px)]">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-gradient-to-bl from-lb-primary to-lb-deep p-[clamp(36px,5vw,60px)] text-white">
          <div className="flex max-w-[620px] flex-col gap-2.5">
            <h2 id="daftar-title" className="m-0 text-[clamp(28px,3.2vw,40px)] font-bold tracking-[-0.6px]">
              {k.title}
            </h2>
            <p className="m-0 text-[17px] leading-[1.6] opacity-95">{k.body}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={ADMIN_HREF} className={`flex h-[54px] items-center rounded-[14px] bg-white px-[26px] text-[17px] font-bold text-lb-deep hover:bg-lb-ground ${white}`}>
              {k.signup}
            </a>
            <a href={DEMO_HREF} target="_blank" rel="noopener" className={`flex h-[54px] items-center rounded-[14px] border-[1.5px] border-white/70 px-[22px] text-[16px] font-semibold text-white hover:bg-white/10 ${white}`}>
              {k.demo}
              <span className="sr-only"> {c.a11y.newTab}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}