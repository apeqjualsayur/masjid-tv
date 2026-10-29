"use client";
// Falak layouts: full (designs/G-Full "Main"), bottom (round-2 common bottom: poster 1824×760 on top,
// prayer bar below), side (G-Side), poster (announcement-only, rules 14–17). Sizes are the mockups ×1.5.
import type { DisplayState } from "@/core";
import type { CSSProperties, FC } from "react";
import { CrossFade } from "../shared/crossfade";
import { CHIP_MARGIN, EMPTY_TEXT, FitBox, templateAreaOf } from "../shared/poster";
import type { LayoutProps, SlideView, TemplateArea } from "../types";
import { FridayStrip } from "./friday";
import { AreaContext, Dial, Logo, Page, Status, nextLine, num, rowLook, serif, tokensOf, type Area } from "./parts";
import { FalakPoster } from "./poster";
import { falakTemplates } from "./templates";
import { F } from "./tokens";

/** Poster boxes (contract rule 10 / round-2 common Bottom; Side 5:4). */
export const AREA = {
  bottom: { x: 48, y: 24, w: 1824, h: 760 },
  side: { x: 60, y: 60, w: 1200, h: 960 },
} as const;
const CARD_PAD = { wide: "72px 84px", tall: "66px 78px" } as const;

/** One slide on the cream card (or a poster image). Exported for previews. */
export function SlideBody({ s, slide, area }: { s: DisplayState; slide?: SlideView; area: Area }) {
  if (slide?.kind === "poster") return <FalakPoster s={s} imageUrl={slide.imageUrl} />;
  if (slide?.kind !== "template") return null;
  const T = falakTemplates[slide.template] as FC<{ s: DisplayState; fields: unknown; area: TemplateArea }>;
  return (
    <div style={{ height: "100%", boxSizing: "border-box", background: F.card, color: F.cardInk, padding: CARD_PAD[area] }}>
      <AreaContext.Provider value={area}>
        <T s={s} fields={slide.fields} area={templateAreaOf(area)} />
      </AreaContext.Provider>
    </div>
  );
}

/** "2 / 6", top-right of the card. */
function Counter({ counter }: { counter?: LayoutProps["counter"] }) {
  if (!counter || counter.total < 2) return null;
  return (
    <div data-counter style={{ position: "absolute", top: 24, right: 28, padding: "8px 18px", borderRadius: 999, background: F.cardInk, color: F.card, fontSize: 21, fontWeight: 700, ...num }}>
      {counter.position} / {counter.total}
    </div>
  );
}

function Card({ s, slide, slideKey, counter, area, style }: LayoutProps & { area: Area; style: CSSProperties }) {
  return (
    <div data-poster-area style={{ position: "absolute", borderRadius: 42, background: F.card, overflow: "hidden", ...style }}>
      <CrossFade id={slideKey ?? "slide"} lite={s.lite}>
        <SlideBody s={s} slide={slide} area={area} />
      </CrossFade>
      <Counter counter={counter} />
    </div>
  );
}

function Header({ s, nameSize, dateSize, logo }: { s: DisplayState; nameSize: number; dateSize: number; logo: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 0 }}>
      <Logo masjid={s.masjid} size={logo} />
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <div style={{ ...serif, fontSize: nameSize, fontWeight: 600, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.masjid.fullName}</div>
        <div style={{ fontSize: dateSize, opacity: 0.78, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
          {s.gregorian} · {s.hijri}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ full

export function FullLayout({ s }: LayoutProps) {
  const t = tokensOf(s);
  const tight = Boolean(s.friday);
  return (
    <Page t={t} style={{ boxSizing: "border-box", padding: 72, display: "flex", gap: 60 }}>
      <div style={{ width: 936, height: 936, flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Dial s={s} size={936} labels />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: tight ? 22 : 33 }}>
        <Header s={s} nameSize={42} dateSize={22} logo={60} />
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {s.current && <Status size={22.5}>● Waktu {s.current.label}</Status>}
          {s.countdownText ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 21, flexWrap: "wrap" }}>
              <div style={{ fontSize: 30, opacity: 0.85 }}>{s.next.label} dalam</div>
              <div style={{ fontSize: 90, fontWeight: 300, lineHeight: 1, letterSpacing: "-0.01em", ...num }}>{s.countdownText}</div>
            </div>
          ) : (
            <div style={{ fontSize: 30, opacity: 0.85 }}>{nextLine(s)}</div>
          )}
        </div>
        <FridayStrip s={s} variant="card" />
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: "auto" }}>
          {s.waktu.map((w) => {
            const r = rowLook(w);
            const cur = w.state === "current";
            return (
              <div
                key={w.key}
                data-current={cur || undefined}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: tight ? "6px 33px" : "11px 33px", borderRadius: 21, borderBottom: `1px solid ${cur ? "transparent" : F.rule}`, background: r.background, color: r.color, opacity: r.opacity }}
              >
                <div style={{ ...serif, fontSize: 39, fontWeight: r.nameWeight }}>{w.label}</div>
                <div style={{ fontSize: 54, fontWeight: r.timeWeight, lineHeight: 1.15, ...num }}>{w.time}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ bottom

export function BottomLayout({ s, slide, slideKey, counter }: LayoutProps) {
  const t = tokensOf(s);
  const top = s.friday ? 852 : 808; // the Friday pill takes the top edge of the bar; the poster keeps its size
  const h = 1080 - 24 - top;
  const dial = h;
  return (
    <Page t={t}>
      <Card s={s} slide={slide} slideKey={slideKey} counter={counter} area="wide" style={{ left: AREA.bottom.x, top: AREA.bottom.y, width: AREA.bottom.w, height: AREA.bottom.h }} />
      <FridayStrip s={s} variant="pill" style={{ position: "absolute", left: 48, top: 800, height: 44 }} />
      <div style={{ position: "absolute", left: 48, right: 48, top, height: h, display: "flex", alignItems: "center", gap: 26 }}>
        <Dial s={s} size={dial} />
        <div style={{ width: 360, flex: "none", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div style={{ ...serif, fontSize: 30, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.masjid.fullName}</div>
          <div style={{ fontSize: 20, opacity: 0.78, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.gregorian}</div>
          {s.current && <Status size={20}>● Waktu {s.current.label}</Status>}
          <div style={{ fontSize: 26, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nextLine(s)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, alignSelf: "stretch", display: "flex", gap: 9, padding: "8px 0", boxSizing: "border-box" }}>
          {s.waktu.map((w) => {
            const r = rowLook(w);
            return (
              <div
                key={w.key}
                data-current={w.state === "current" || undefined}
                style={{ flex: 1, minWidth: 0, borderRadius: 27, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, background: w.state === "current" ? r.background : F.panel, color: r.color, opacity: r.opacity }}
              >
                <div style={{ ...serif, fontSize: 30, fontWeight: r.nameWeight }}>{w.label}</div>
                <div style={{ fontSize: 48, fontWeight: r.timeWeight, lineHeight: 1.1, ...num }}>{w.time}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ side

export function SideLayout({ s, slide, slideKey, counter }: LayoutProps) {
  const t = tokensOf(s);
  const fri = Boolean(s.friday);
  return (
    <Page t={t}>
      <Card s={s} slide={slide} slideKey={slideKey} counter={counter} area="tall" style={{ left: AREA.side.x, top: AREA.side.y, width: AREA.side.w, height: AREA.side.h }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 600, boxSizing: "border-box", padding: "40px 42px 36px", background: F.panel, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ alignSelf: "stretch" }}>
          <Header s={s} nameSize={31.5} dateSize={19.5} logo={46} />
        </div>
        <Dial s={s} size={fri ? 220 : 290} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <Status size={18}>
            {s.current ? `● Waktu ${s.current.label} · ` : ""}
            {s.clock}
          </Status>
          <div style={{ fontSize: 27, fontWeight: 500 }}>{nextLine(s)}</div>
        </div>
        <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: 2, marginTop: "auto" }}>
          {s.waktu.map((w) => {
            const r = rowLook(w);
            return (
              <div
                key={w.key}
                data-current={w.state === "current" || undefined}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 24px", borderRadius: 18, background: r.background, color: r.color, opacity: r.opacity }}
              >
                <div style={{ ...serif, fontSize: 33, fontWeight: r.nameWeight }}>{w.label}</div>
                <div style={{ fontSize: 54, fontWeight: r.timeWeight, lineHeight: 1.12, ...num }}>{w.time}</div>
              </div>
            );
          })}
        </div>
        <FridayStrip s={s} variant="card" style={{ alignSelf: "stretch" }} />
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ poster (announcement-only)

/** Content box of the side (5:4) card: 1200×960 minus its 66/78 px padding. Scaled up to fill 16:9. */
const POSTER_CONTENT = { w: 1044, h: 828 };

function PosterSlide({ s, slide }: { s: DisplayState; slide: SlideView }) {
  if (slide.kind === "poster") return <FalakPoster s={s} imageUrl={slide.imageUrl} />;
  const T = falakTemplates[slide.template] as FC<{ s: DisplayState; fields: unknown; area: TemplateArea }>;
  return (
    <div style={{ position: "absolute", inset: 0, background: F.card, color: F.cardInk }}>
      <FitBox w={POSTER_CONTENT.w} h={POSTER_CONTENT.h}>
        <AreaContext.Provider value="tall">
          <T s={s} fields={slide.fields} area="poster" />
        </AreaContext.Provider>
      </FitBox>
    </div>
  );
}

/** Logo + short name, bottom-left, 70 % opacity (rule 14). Kematian: name only, no gold (rule 7). */
function BrandChip({ s, sober }: { s: DisplayState; sober: boolean }) {
  const t = tokensOf(s);
  return (
    <div
      data-brand-chip
      style={{ position: "absolute", left: CHIP_MARGIN, bottom: CHIP_MARGIN, display: "flex", alignItems: "center", gap: 12, padding: sober ? "12px 22px" : "8px 22px 8px 8px", borderRadius: 999, background: t.bg, color: F.text, opacity: 0.7, fontSize: 22, fontWeight: 700 }}
    >
      {!sober && <Logo masjid={s.masjid} size={40} />}
      {s.masjid.shortName}
    </div>
  );
}

/** Rule 17: calm cream card on the phase colour; no prayer data. */
function PosterEmpty({ s }: { s: DisplayState }) {
  return (
    <div data-empty style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 1100, boxSizing: "border-box", padding: "96px 110px", borderRadius: 42, background: F.card, color: F.cardInk, display: "flex", flexDirection: "column", alignItems: "center", gap: 28, textAlign: "center" }}>
        <Logo masjid={s.masjid} size={140} color={F.cardInk} />
        <div style={{ ...serif, fontSize: 60, fontWeight: 600, lineHeight: 1.12 }}>{s.masjid.fullName}</div>
        <div style={{ fontSize: 32, fontWeight: 500, color: F.cardMuted }}>{EMPTY_TEXT}</div>
      </div>
    </div>
  );
}

/** Announcement-only screen (contract rules 14–17): the slide edge-to-edge, nothing about prayer times. */
export function PosterLayout({ s, slide, slideKey }: LayoutProps) {
  const t = tokensOf(s);
  return (
    <Page t={t}>
      {slide ? (
        <>
          <div data-poster-area style={{ position: "absolute", inset: 0, overflow: "hidden", background: F.card }}>
            <CrossFade id={slideKey ?? "slide"} lite={s.lite}>
              <PosterSlide s={s} slide={slide} />
            </CrossFade>
          </div>
          <BrandChip s={s} sober={slide.kind === "template" && slide.template === "kematian"} />
        </>
      ) : (
        <PosterEmpty s={s} />
      )}
    </Page>
  );
}
