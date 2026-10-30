"use client";
// Landing sections drawn with the REAL themes (PRD §4 rows 6, 8, 11). Each render mounts only when it
// scrolls near the viewport and is drawn once at a fixed time on Thursday 22 Oct 2026 in WLY01
// (a Thursday, so no Friday rules), from the bundled year file.
import type { CSSProperties, FC } from "react";
import type { DisplayState, ThemeId } from "@/core";
import { TEMPLATE_KEYS, type SlideView } from "@/templates";
import { ABSTRACT_THUMBS, LANDING_SAMPLES } from "./template-samples";
import { tokensOf } from "@/themes/tenang/parts";
import { SlideBody } from "@/themes/tenang/layouts";
import { FONT } from "@/themes/tenang/tokens";
import { TOKENS as TENANG } from "@/themes/tenang/tokens";
import { ThemeView } from "@/themes/ThemeView";
import { ScaledStage, TvFrame } from "./frames";
import { copy, type Lang } from "./i18n";
import { InView, useSnapshot } from "./lazy";
import { SectionHead, h2Class, Eyebrow, sectionPad } from "./sections";
import { landingThemes } from "./themes-list";

export const SHOWCASE_DATE = "2026-10-22";
const MIN = 60_000;
/** Minutes from Zohor (13:01 that day) at which the engine is in each mode. Azan 3 min, iqamah 10. */
export const DAY_OFFSETS = [40, -2, 1, 8, 16] as const; // normal, pre_azan, azan, iqamah, solat
/** Fixed times for the Tema section (PRD §4 row 11): each theme in a phase that shows it well. */
export const THEME_TIMES: { id: ThemeId; hour: number; minute: number }[] = [
  { id: "tenang", hour: 13, minute: 20 },
  { id: "serambi", hour: 19, minute: 15 },
  { id: "alam", hour: 19, minute: 6 },
  { id: "falak", hour: 6, minute: 20 },
  { id: "garis", hour: 14, minute: 40 },
  { id: "kerawang", hour: 17, minute: 20 },
  { id: "seterusnya", hour: 21, minute: 10 },
];
const atLocal = (hour: number, minute: number) => Date.UTC(2026, 9, 22, hour - 8, minute);

const SMALL_SHADOW = "none";

/** One small TV of the "Satu hari" row: the real Tenang screen for that mode (full layout when normal). */
function DayTv({ offset, label }: { offset: number; label: string }) {
  const snap = useSnapshot("tenang", SHOWCASE_DATE, (zohor) => zohor + offset * MIN);
  return (
    <TvFrame small label={label} shadow={SMALL_SHADOW} stand={false} screenBg={TENANG.zohor.bg}>
      {snap && <ThemeView theme={snap.theme} s={snap.s} layout="full" />}
    </TvFrame>
  );
}

export function DaySection({ lang }: { lang: Lang }) {
  const d = copy(lang).day;
  const placeholder = (label: string) => <TvFrame small label={label} shadow={SMALL_SHADOW} stand={false} screenBg={TENANG.zohor.bg} />;
  return (
    <section id="sehari" aria-labelledby="sehari-title" className={`bg-lb-ground ${sectionPad}`}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-5">
        <SectionHead id="sehari-title" eyebrow={d.eyebrow} title={d.title} body={d.body} />
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-[18px]">
          {d.items.map((it, i) => {
            const label = `${it.tag}: ${it.t}`;
            return (
              <li key={it.tag} className="flex flex-col gap-2.5">
                <InView placeholder={placeholder(label)}>
                  <DayTv offset={DAY_OFFSETS[i]} label={label} />
                </InView>
                <p className="m-0 text-[13px] font-bold text-lb-deep">{it.time}</p>
                <h3 className="m-0 text-[17px] font-bold">{it.t}</h3>
                <p className="m-0 text-[14px] leading-[1.55] text-lb-muted">{it.d}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/** Tenang's slide card size in the bottom layout is 12:5; templates are drawn at 1728×720. */
const CARD_W = 1728;
const CARD_H = 720;

function TemplateThumb({ index }: { index: number }) {
  const snap = useSnapshot("tenang", SHOWCASE_DATE, (zohor) => zohor + 40 * MIN);
  if (!snap) return null;
  const t = tokensOf(snap.s);
  const Body = SlideBody as FC<{ s: DisplayState; slide: SlideView; area: "wide" }>;
  const key = TEMPLATE_KEYS[index];
  const slide = { kind: "template", template: key, fields: LANDING_SAMPLES[key] } as SlideView;
  const style: CSSProperties = { width: CARD_W, height: CARD_H, fontFamily: FONT, color: t.fg, background: t.card };
  return (
    <div style={style}>
      <Body s={snap.s} slide={slide} area="wide" />
    </div>
  );
}

/** The design's abstract 12:5 thumbnail: three bars in the template's tint. */
function AbstractThumb({ bg, fg }: { bg: string; fg: string }) {
  return (
    <div aria-hidden="true" className="box-border flex aspect-[12/5] flex-col justify-center gap-[5px] border-b border-lb-hair p-3" style={{ background: bg }}>
      <div className="h-[5px] w-[40%] rounded-[3px] opacity-60" style={{ background: fg }} />
      <div className="h-[10px] w-[75%] rounded" style={{ background: fg }} />
      <div className="h-[5px] w-[55%] rounded-[3px] opacity-40" style={{ background: fg }} />
    </div>
  );
}

export function TemplatesSection({ lang }: { lang: Lang }) {
  const k = copy(lang).templates;
  return (
    <section id="templat" aria-labelledby="templat-title" className={`bg-lb-ground ${sectionPad}`}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-9 px-5">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex max-w-[640px] flex-col gap-3">
            <Eyebrow>{k.eyebrow}</Eyebrow>
            <h2 id="templat-title" className={h2Class}>
              {k.title}
            </h2>
          </div>
          <p className="m-0 max-w-[380px] text-[16px] leading-[1.6] text-lb-muted">{k.body}</p>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3.5">
          {k.items.map((it, i) => (
            <li key={it.n} className="overflow-hidden rounded-2xl border border-lb-line bg-white">
              {ABSTRACT_THUMBS[TEMPLATE_KEYS[i]] ? (
                <AbstractThumb {...ABSTRACT_THUMBS[TEMPLATE_KEYS[i]]!} />
              ) : (
                <ScaledStage width={CARD_W} height={CARD_H} style={{ background: TENANG.zohor.card }} className="border-b border-lb-hair">
                  <InView margin="400px">
                    <TemplateThumb index={i} />
                  </InView>
                </ScaledStage>
              )}
              <div className="flex flex-col gap-[3px] px-3.5 py-3">
                <h3 className="m-0 text-[15px] font-bold">{it.n}</h3>
                <p className="m-0 text-[13px] text-lb-muted">{it.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** One theme in the Tema row: its full layout at a fixed time (drawn directly, whatever the mode). */
function ThemeTv({ id, hour, minute, label }: { id: ThemeId; hour: number; minute: number; label: string }) {
  const snap = useSnapshot(id, SHOWCASE_DATE, () => atLocal(hour, minute));
  const Full = snap?.theme.layouts.full;
  return (
    <TvFrame small label={label} shadow={SMALL_SHADOW} stand={false} screenBg="#121614">
      {snap && Full && <Full s={snap.s} />}
    </TvFrame>
  );
}

export function ThemesSection({ lang }: { lang: Lang }) {
  const k = copy(lang).themes;
  const ids = landingThemes();
  const all = ids.length > 3;
  const items = k.items.filter((it) => ids.includes(it.id as ThemeId));
  return (
    <section id="tema" aria-labelledby="tema-title" className={sectionPad}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5">
        <SectionHead id="tema-title" eyebrow={k.eyebrow} title={all ? k.titleAll : k.title} body={all ? k.bodyAll : k.body} />
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-[22px]">
          {items.map((it) => {
            const tt = THEME_TIMES.find((x) => x.id === it.id)!;
            const label = `${it.n}: ${it.d}`;
            return (
              <li key={it.n} className="flex flex-col gap-2.5">
                <InView placeholder={<TvFrame small label={label} shadow={SMALL_SHADOW} stand={false} screenBg="#121614" />}>
                  <ThemeTv id={tt.id} hour={tt.hour} minute={tt.minute} label={label} />
                </InView>
                <h3 className="m-0 text-[18px] font-bold">{it.n}</h3>
                <p className="m-0 text-[14px] text-lb-muted">{it.d}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}