"use client";
// Hero (PRD §4 row 2): app icon, chip, H1, paragraph, CTAs, "Berfungsi pada" chips; right: the real
// Tenang TV with the phone mockup overlapping (phone hidden below 900 px). The text is plain server-
// rendered HTML, so the H1 paints first; the glow behind the TV follows the TV's prayer period.
import { useCallback, useState } from "react";
import { TOKENS as TENANG } from "@/themes/tenang/tokens";
import { DEMO_HREF } from "./Footer";
import { ADMIN_HREF } from "./Header";
import { HeroTv } from "./HeroTv";
import { copy, type Lang } from "./i18n";
import { DEVICE_ICONS, LineIcon } from "./icons";
import { PhoneFrame } from "./frames";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lb-deep";
/** Slide thumbnails in the phone mockup (template tints, as in the design). */
const SLIDE_TINTS = ["var(--color-lb-soft)", "#FFF1D6", "#E6EEF8"];

function HeroPhone({ lang }: { lang: Lang }) {
  const p = copy(lang).hero.phone;
  return (
    <PhoneFrame label={copy(lang).a11y.phoneMock} className="absolute right-[-10px] bottom-0 hidden shadow-[0_24px_50px_rgba(16,36,27,0.3)] min-[900px]:block">
      <div className="text-[10px] font-bold">{p.greeting}</div>
      <div className="rounded-xl bg-lb-deep p-[9px] text-white">
        <div className="text-[8px] opacity-85">{p.screen}</div>
        <div className="text-[12px] font-bold">{p.online}</div>
      </div>
      <div className="text-[8px] font-bold text-lb-muted">{p.showing}</div>
      {p.slides.map((n, i) => (
        <div key={n} className="flex items-center gap-1.5 rounded-[9px] bg-white p-[5px]">
          <div className="h-4 w-[26px] flex-none rounded" style={{ background: SLIDE_TINTS[i] }} />
          <div className="text-[8px] font-semibold">{n}</div>
        </div>
      ))}
      <div className="mt-auto flex h-7 items-center justify-center rounded-[10px] bg-lb-ink text-[9px] font-bold text-white">{p.new}</div>
    </PhoneFrame>
  );
}

export function Hero({ lang }: { lang: Lang }) {
  const c = copy(lang);
  const h = c.hero;
  const [glow, setGlow] = useState(TENANG.zohor.glow);
  const onPhase = useCallback((_: unknown, g: string) => setGlow(g), []);
  return (
    <section id="hero" aria-labelledby="hero-title" style={{ background: `radial-gradient(1200px 560px at 75% 30%, ${glow} 0%, #FFFFFF 70%)` }}>
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-5 pt-[clamp(40px,6vw,84px)] pb-[clamp(40px,5vw,64px)]">
        <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-[22px]">
          <img src="/brand/mv-app-icon.svg" alt="" width={64} height={64} className="h-16 w-16 rounded-[18px] shadow-[0_14px_30px_rgba(20,108,74,0.3)]" />
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-lb-line bg-white px-3.5 py-[7px] text-[14px] font-semibold text-lb-deep">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-lb-primary" />
            {h.chip}
          </div>
          <h1 id="hero-title" className="m-0 text-[clamp(36px,4.6vw,56px)] leading-[1.08] font-bold tracking-[-1.4px]">
            {h.title}
          </h1>
          <p className="m-0 max-w-[520px] text-[clamp(17px,1.5vw,19px)] leading-[1.65] text-lb-muted">
            {h.bodyBefore}
            <b className="text-lb-ink">{h.bodyUrl}</b>
            {h.bodyAfter}
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={ADMIN_HREF} className={`flex h-[52px] items-center rounded-xl bg-lb-ink px-6 text-[16px] font-semibold text-white hover:bg-lb-deep ${focusRing}`}>
              {h.signup}
            </a>
            <a href={DEMO_HREF} target="_blank" rel="noopener" className={`flex h-[52px] items-center gap-2 rounded-xl border border-lb-line bg-white px-[22px] text-[16px] font-semibold hover:border-lb-primary ${focusRing}`}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" className="fill-lb-primary">
                <path d="M8 5v14l11-7Z" />
              </svg>
              {h.demo}
              <span className="sr-only"> {c.a11y.newTab}</span>
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[14px] text-lb-muted">
            <span className="mr-1">{h.worksOn}</span>
            {c.devices.items.map((d, i) => (
              <span key={d.s} className="inline-flex items-center gap-1.5 rounded-full border border-lb-line bg-white px-[11px] py-1.5 font-medium text-lb-ink">
                <LineIcon d={DEVICE_ICONS[i]} size={15} className="text-lb-primary" />
                {d.s}
              </span>
            ))}
          </div>
        </div>

        <div className="relative min-w-0 flex-[1_1_560px] pb-[70px]">
          <HeroTv label={c.a11y.tvMock} onPhase={onPhase} />
          <HeroPhone lang={lang} />
        </div>
      </div>
    </section>
  );
}