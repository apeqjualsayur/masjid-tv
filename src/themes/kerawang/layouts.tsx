"use client";
// Kerawang layouts: full (designs/J-Full, 7 arch panels), bottom (round-2 common bottom: poster 1824×760
// on top, short arch panels below), side (J-Side, one row panel per waktu; poster 1185×948), poster
// (rules 14–17). Sizes = mockups ×1.5.
import type { DisplayState } from "@/core";
import type { CSSProperties, FC } from "react";
import { CrossFade } from "../shared/crossfade";
import { CHIP_MARGIN, EMPTY_TEXT, FitBox, templateAreaOf } from "../shared/poster";
import { TICKER_LABEL, tickerNow } from "../shared/ticker";
import type { LayoutProps, SlideView, TemplateArea } from "../types";
import { FridayStrip } from "./friday";
import { ArchPanel, AreaContext, Logo, Page, RowPanel, Status, bgOf, nextLine, num, serif, type Area, type ArchSize } from "./parts";
import { AwanBand } from "./patterns";
import { KerawangPoster } from "./poster";
import { kerawangTemplates } from "./templates";
import { K } from "./tokens";

/** Poster boxes (contract rule 10 / round-2 common Bottom; Side 5:4, contract §8). */
export const AREA = {
  bottom: { x: 48, y: 24, w: 1824, h: 760 },
  side: { x: 45, y: 66, w: 1185, h: 948 },
} as const;
/** Gold frame of the template card (contract §8): 9 px #D4A94E with inset cream and bronze rings. */
const FRAME = 9;
const CARD_PAD = { wide: "66px 84px", tall: "60px 72px" } as const;

const isKematian = (slide?: SlideView) => slide?.kind === "template" && slide.template === "kematian";

/** Cream card in its carved-gold frame; Kematian: a plain dark panel, no pattern, no gold. */
function cardStyle(sober: boolean): CSSProperties {
  return sober
    ? { background: K.timber, color: K.soberText, border: `${FRAME}px solid ${K.timber}` }
    : { background: K.card, color: K.cardInk, border: `${FRAME}px solid ${K.awan}`, boxShadow: `inset 0 0 0 4.5px ${K.card}, inset 0 0 0 7.5px ${K.border}` };
}

/** One slide on the framed card (or a poster image, unframed so the box keeps its exact ratio). */
export function SlideBody({ s, slide, area }: { s: DisplayState; slide?: SlideView; area: Area }) {
  if (slide?.kind === "poster") return <KerawangPoster s={s} imageUrl={slide.imageUrl} />;
  if (slide?.kind !== "template") return null;
  const T = kerawangTemplates[slide.template] as FC<{ s: DisplayState; fields: unknown; area: TemplateArea }>;
  const sober = isKematian(slide);
  return (
    <div data-card={sober ? "sober" : "framed"} style={{ height: "100%", boxSizing: "border-box", borderRadius: 21, padding: CARD_PAD[area], ...cardStyle(sober) }}>
      <AreaContext.Provider value={area}>
        <T s={s} fields={slide.fields} area={templateAreaOf(area)} />
      </AreaContext.Provider>
    </div>
  );
}

function Counter({ counter }: { counter?: LayoutProps["counter"] }) {
  if (!counter || counter.total < 2) return null;
  return (
    <div data-counter style={{ position: "absolute", top: 30, right: 33, padding: "8px 18px", borderRadius: 999, background: K.timber, color: K.text, fontSize: 21, fontWeight: 700, ...num }}>
      {counter.position} / {counter.total}
    </div>
  );
}

function Card({ s, slide, slideKey, counter, area, style }: LayoutProps & { area: Area; style: CSSProperties }) {
  return (
    <div data-poster-area style={{ position: "absolute", borderRadius: 21, overflow: "hidden", ...style }}>
      <CrossFade id={slideKey ?? "slide"} lite={s.lite}>
        <SlideBody s={s} slide={slide} area={area} />
      </CrossFade>
      <Counter counter={counter} />
    </div>
  );
}

// ------------------------------------------------------------------ full

const FULL_ARCH: ArchSize = { top: 129, bottom: 21, border: 6, plaque: 225, name: 39, time: 69, glow: K.glow };
const TICKER_H = 72;

export function FullLayout({ s }: LayoutProps) {
  const ticker = tickerNow(s);
  return (
    <Page s={s}>
      <AwanBand edge="top" />
      <AwanBand edge="bottom" />
      <div style={{ position: "absolute", left: 0, right: 0, top: 39, bottom: 39 + (ticker ? TICKER_H : 0), boxSizing: "border-box", padding: "30px 57px", display: "flex", flexDirection: "column", gap: 27 }}>
        <div style={{ height: 177, flex: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Logo masjid={s.masjid} size={72} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ ...serif, fontSize: 51, fontWeight: 600, lineHeight: 1.1 }}>{s.masjid.fullName}</div>
              <div style={{ fontSize: 25.5, opacity: 0.85 }}>
                {s.gregorian} · {s.hijri}
              </div>
              {s.current && <Status size={22.5}>● Waktu {s.current.label}</Status>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 138, fontWeight: 300, lineHeight: 1, ...num }}>{s.clock}</div>
            <div style={{ fontSize: 30, fontWeight: 500 }}>{nextLine(s)}</div>
          </div>
        </div>
        {s.friday && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -12 }}>
            <FridayStrip s={s} variant="pill" style={{ height: 52 }} />
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 21 }}>
          {s.waktu.map((w) => (
            <ArchPanel key={w.key} w={w} s={s} size={FULL_ARCH} />
          ))}
        </div>
      </div>
      {ticker && (
        <div data-ticker style={{ position: "absolute", left: 0, right: 0, bottom: 39, height: TICKER_H, boxSizing: "border-box", padding: "0 57px", background: K.band, borderTop: `3px solid ${K.border}`, display: "flex", alignItems: "center", gap: 24 }}>
          <Status size={21}>{TICKER_LABEL}</Status>
          <div style={{ flex: 1, minWidth: 0, fontSize: 28, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ticker}</div>
        </div>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ bottom

const bottomArch = (fri: boolean): ArchSize => ({ top: 69, bottom: 15, border: 4.5, plaque: fri ? 104 : 116, name: 27, time: 48, glow: "0 0 60px 6px rgba(242,196,90,0.55)" });

export function BottomLayout({ s, slide, slideKey, counter }: LayoutProps) {
  const fri = Boolean(s.friday);
  const top = fri ? 852 : 808; // the Friday pill takes the top edge of the bar; the poster keeps its size
  return (
    <Page s={s}>
      <Card s={s} slide={slide} slideKey={slideKey} counter={counter} area="wide" style={{ left: AREA.bottom.x, top: AREA.bottom.y, width: AREA.bottom.w, height: AREA.bottom.h }} />
      <FridayStrip s={s} variant="pill" style={{ position: "absolute", left: 48, top: 800, height: 44 }} />
      <div style={{ position: "absolute", left: 48, right: 48, top, bottom: 24, display: "flex", alignItems: "stretch", gap: 30 }}>
        <div style={{ width: 345, flex: "none", display: "flex", flexDirection: "column", justifyContent: "flex-end", minWidth: 0 }}>
          {s.current && <Status size={20}>● Waktu {s.current.label}</Status>}
          <div style={{ fontSize: fri ? 84 : 102, fontWeight: 300, lineHeight: 1, ...num }}>{s.clock}</div>
          <div style={{ fontSize: 22.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nextLine(s)}</div>
          <div style={{ fontSize: 20, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.gregorian}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 15 }}>
          {s.waktu.map((w) => (
            <ArchPanel key={w.key} w={w} s={s} size={bottomArch(fri)} />
          ))}
        </div>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ side

export function SideLayout({ s, slide, slideKey, counter }: LayoutProps) {
  return (
    <Page s={s}>
      <AwanBand edge="top" />
      <AwanBand edge="bottom" />
      <Card s={s} slide={slide} slideKey={slideKey} counter={counter} area="tall" style={{ left: AREA.side.x, top: AREA.side.y, width: AREA.side.w, height: AREA.side.h }} />
      <div style={{ position: "absolute", left: 1275, width: 600, top: 66, bottom: 66, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <Logo masjid={s.masjid} size={48} />
          <div style={{ ...serif, fontSize: 31.5, fontWeight: 600, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.masjid.fullName}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, paddingBottom: 9 }}>
            <div style={{ fontSize: 21, opacity: 0.85, whiteSpace: "nowrap" }}>{s.gregorian}</div>
            {s.current && <Status size={19.5}>● Waktu {s.current.label}</Status>}
          </div>
          <div style={{ fontSize: 114, fontWeight: 300, lineHeight: 1, flex: "none", ...num }}>{s.clock}</div>
        </div>
        {/* own row: a 5-digit clock ("10:00") leaves no room for it beside the clock */}
        <div style={{ fontSize: 24, fontWeight: 500, marginTop: -6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nextLine(s)}</div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 9, marginTop: 6 }}>
          {s.waktu.map((w) => (
            <RowPanel key={w.key} w={w} s={s} />
          ))}
        </div>
        <FridayStrip s={s} variant="card" />
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ poster (announcement-only)

/** Content box of the side (5:4) card: 1185×948 minus frame and padding. Scaled up to fill 16:9. */
const POSTER_CONTENT = { w: 1185 - 2 * (FRAME + 72), h: 948 - 2 * (FRAME + 60) };

function PosterSlide({ s, slide }: { s: DisplayState; slide: SlideView }) {
  if (slide.kind === "poster") return <KerawangPoster s={s} imageUrl={slide.imageUrl} />;
  const T = kerawangTemplates[slide.template] as FC<{ s: DisplayState; fields: unknown; area: TemplateArea }>;
  const sober = isKematian(slide);
  return (
    <div data-card={sober ? "sober" : "framed"} style={{ position: "absolute", inset: 0, boxSizing: "border-box", ...cardStyle(sober) }}>
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
  return (
    <div
      data-brand-chip
      style={{ position: "absolute", left: CHIP_MARGIN, bottom: CHIP_MARGIN, display: "flex", alignItems: "center", gap: 12, padding: sober ? "12px 22px" : "8px 22px 8px 14px", borderRadius: 999, background: sober ? K.timber : bgOf(s), color: K.text, opacity: 0.7, fontSize: 22, fontWeight: 700 }}
    >
      {!sober && <Logo masjid={s.masjid} size={40} />}
      {s.masjid.shortName}
    </div>
  );
}

/** Rule 17: calm framed card on the timber wall; no prayer data. */
function PosterEmpty({ s }: { s: DisplayState }) {
  return (
    <div data-empty style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 1100, boxSizing: "border-box", padding: "96px 110px", borderRadius: 21, ...cardStyle(false), display: "flex", flexDirection: "column", alignItems: "center", gap: 28, textAlign: "center" }}>
        <Logo masjid={s.masjid} size={140} arch={K.cardInk} dot={K.gold} />
        <div style={{ ...serif, fontSize: 60, fontWeight: 600, lineHeight: 1.12 }}>{s.masjid.fullName}</div>
        <div style={{ fontSize: 32, fontWeight: 500, color: K.cardMuted }}>{EMPTY_TEXT}</div>
      </div>
    </div>
  );
}

/** Announcement-only screen (contract rules 14–17): the slide edge-to-edge, nothing about prayer times. */
export function PosterLayout({ s, slide, slideKey }: LayoutProps) {
  return (
    <Page s={s}>
      {slide ? (
        <>
          <div data-poster-area style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <CrossFade id={slideKey ?? "slide"} lite={s.lite}>
              <PosterSlide s={s} slide={slide} />
            </CrossFade>
          </div>
          <BrandChip s={s} sober={isKematian(slide)} />
        </>
      ) : (
        <PosterEmpty s={s} />
      )}
    </Page>
  );
}
