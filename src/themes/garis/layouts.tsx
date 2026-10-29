"use client";
// Garis Masa layouts: full (designs/I-Full), bottom (round-2 common bottom: poster 1824×760 on top,
// timeline bar below), side (I-Side, vertical timeline), poster (rules 14–17). Sizes = mockups ×1.5.
import type { DisplayState } from "@/core";
import type { CSSProperties, FC } from "react";
import { CrossFade } from "../shared/crossfade";
import { CHIP_MARGIN, EMPTY_TEXT, FitBox, templateAreaOf } from "../shared/poster";
import { TICKER_LABEL, tickerNow } from "../shared/ticker";
import type { LayoutProps, SlideView, TemplateArea } from "../types";
import { FridayStrip } from "./friday";
import { AreaContext, Logo, Page, Status, accent, bakiLine, bgOf, num, serif, type Area } from "./parts";
import { GarisPoster } from "./poster";
import { garisTemplates } from "./templates";
import { HorizontalTimeline, VerticalTimeline } from "./timeline";
import { G } from "./tokens";

/** Poster boxes (contract rule 10 / round-2 common Bottom; Side 5:4). */
export const AREA = {
  bottom: { x: 48, y: 24, w: 1824, h: 760 },
  side: { x: 60, y: 60, w: 1200, h: 960 },
} as const;
const CARD_PAD = { wide: "72px 84px", tall: "66px 78px" } as const;

/** One slide on the cream card (or a poster image). */
export function SlideBody({ s, slide, area }: { s: DisplayState; slide?: SlideView; area: Area }) {
  if (slide?.kind === "poster") return <GarisPoster s={s} imageUrl={slide.imageUrl} />;
  if (slide?.kind !== "template") return null;
  const T = garisTemplates[slide.template] as FC<{ s: DisplayState; fields: unknown; area: TemplateArea }>;
  return (
    <div style={{ height: "100%", boxSizing: "border-box", background: G.card, color: G.cardInk, padding: CARD_PAD[area] }}>
      <AreaContext.Provider value={area}>
        <T s={s} fields={slide.fields} area={templateAreaOf(area)} />
      </AreaContext.Provider>
    </div>
  );
}

function Counter({ counter }: { counter?: LayoutProps["counter"] }) {
  if (!counter || counter.total < 2) return null;
  return (
    <div data-counter style={{ position: "absolute", top: 24, right: 28, padding: "8px 18px", borderRadius: 999, background: G.cardInk, color: G.card, fontSize: 21, fontWeight: 700, ...num }}>
      {counter.position} / {counter.total}
    </div>
  );
}

function Card({ s, slide, slideKey, counter, area, style }: LayoutProps & { area: Area; style: CSSProperties }) {
  return (
    <div data-poster-area style={{ position: "absolute", borderRadius: 39, background: G.card, overflow: "hidden", ...style }}>
      <CrossFade id={slideKey ?? "slide"} lite={s.lite}>
        <SlideBody s={s} slide={slide} area={area} />
      </CrossFade>
      <Counter counter={counter} />
    </div>
  );
}

const imsakNote = (s: DisplayState) => {
  const imsak = s.waktu.find((w) => w.key === "imsak");
  return imsak ? `Imsak ${imsak.time}` : "";
};

// ------------------------------------------------------------------ full

export function FullLayout({ s }: LayoutProps) {
  const a = accent(s);
  const ticker = tickerNow(s);
  const clock = 375 - (ticker ? 60 : 0) - (s.friday ? 75 : 0);
  return (
    <Page s={s} style={{ boxSizing: "border-box", padding: `60px 120px ${ticker ? 54 + 72 : 54}px`, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 21 }}>
          <Logo masjid={s.masjid} size={54} dot={a} />
          <div style={{ ...serif, fontSize: 42, fontWeight: 600 }}>{s.masjid.fullName}</div>
        </div>
        <div style={{ fontSize: 27, opacity: 0.8 }}>
          {s.gregorian} · {s.hijri}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9 }}>
        {s.current && (
          <Status size={27} color={a}>
            ● Waktu {s.current.label}
          </Status>
        )}
        <div style={{ fontSize: clock, fontWeight: 200, lineHeight: 0.95, letterSpacing: "-0.03em", ...num }}>{s.clock}</div>
        <div style={{ fontSize: 45, fontWeight: 500 }}>{bakiLine(s)}</div>
        <FridayStrip s={s} variant="pill" style={{ marginTop: 12 }} />
      </div>
      <HorizontalTimeline s={s} length={1680} bar={96} chip={36} name={25.5} time={54} segFont={30} />
      <div style={{ fontSize: 21, opacity: 0.7, marginTop: 4 }}>{imsakNote(s)} · garis ini menunjukkan tempoh sebenar setiap waktu</div>
      {ticker && (
        <div data-ticker style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 72, boxSizing: "border-box", padding: "0 120px", background: G.band, display: "flex", alignItems: "center", gap: 24 }}>
          <Status size={20} color={a}>
            {TICKER_LABEL}
          </Status>
          <div style={{ flex: 1, minWidth: 0, fontSize: 28, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ticker}</div>
        </div>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ bottom

export function BottomLayout({ s, slide, slideKey, counter }: LayoutProps) {
  const a = accent(s);
  const top = s.friday ? 852 : 808; // the Friday pill takes the top edge of the bar; the poster keeps its size
  return (
    <Page s={s}>
      <Card s={s} slide={slide} slideKey={slideKey} counter={counter} area="wide" style={{ left: AREA.bottom.x, top: AREA.bottom.y, width: AREA.bottom.w, height: AREA.bottom.h }} />
      <FridayStrip s={s} variant="pill" style={{ position: "absolute", left: 48, top: 800, height: 44 }} />
      <div style={{ position: "absolute", left: 48, right: 48, top, bottom: 24, display: "flex", alignItems: "flex-end", gap: 36 }}>
        <div style={{ width: 330, flex: "none", display: "flex", flexDirection: "column", minWidth: 0 }}>
          {s.current && (
            <Status size={20} color={a}>
              ● Waktu {s.current.label}
            </Status>
          )}
          <div style={{ fontSize: s.friday ? 100 : 120, fontWeight: 200, lineHeight: 1, letterSpacing: "-0.03em", ...num }}>{s.clock}</div>
          <div style={{ fontSize: 22, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bakiLine(s)}</div>
          <div style={{ fontSize: 20, opacity: 0.7 }}>{imsakNote(s)}</div>
        </div>
        <HorizontalTimeline s={s} length={1458} bar={54} chip={22} name={21} time={44} inline segFont={22} />
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ side

export function SideLayout({ s, slide, slideKey, counter }: LayoutProps) {
  const a = accent(s);
  const fri = Boolean(s.friday);
  return (
    <Page s={s}>
      <Card s={s} slide={slide} slideKey={slideKey} counter={counter} area="tall" style={{ left: AREA.side.x, top: AREA.side.y, width: AREA.side.w, height: AREA.side.h }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 600, boxSizing: "border-box", padding: "39px 45px 30px", background: G.panel, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Logo masjid={s.masjid} size={46} dot={a} />
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ ...serif, fontSize: 31.5, fontWeight: 600, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.masjid.fullName}</div>
            <div style={{ fontSize: 19.5, opacity: 0.8, whiteSpace: "nowrap" }}>{s.gregorian}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", paddingTop: 6 }}>
          {s.current && (
            <Status size={19.5} color={a}>
              ● Waktu {s.current.label}
            </Status>
          )}
          <div style={{ fontSize: fri ? 120 : 150, fontWeight: 200, lineHeight: 1, letterSpacing: "-0.03em", ...num }}>{s.clock}</div>
          <div style={{ fontSize: 27, fontWeight: 500 }}>{bakiLine(s)}</div>
        </div>
        <div style={{ marginTop: 18 }}>
          <VerticalTimeline s={s} length={fri ? 470 : 620} />
        </div>
        <div style={{ fontSize: 19.5, opacity: 0.7 }}>{imsakNote(s)} · tinggi setiap blok = tempoh sebenar</div>
        <FridayStrip s={s} variant="card" />
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ poster (announcement-only)

/** Content box of the side (5:4) card: 1200×960 minus its 66/78 px padding. Scaled up to fill 16:9. */
const POSTER_CONTENT = { w: 1044, h: 828 };

function PosterSlide({ s, slide }: { s: DisplayState; slide: SlideView }) {
  if (slide.kind === "poster") return <GarisPoster s={s} imageUrl={slide.imageUrl} />;
  const T = garisTemplates[slide.template] as FC<{ s: DisplayState; fields: unknown; area: TemplateArea }>;
  return (
    <div style={{ position: "absolute", inset: 0, background: G.card, color: G.cardInk }}>
      <FitBox w={POSTER_CONTENT.w} h={POSTER_CONTENT.h}>
        <AreaContext.Provider value="tall">
          <T s={s} fields={slide.fields} area="poster" />
        </AreaContext.Provider>
      </FitBox>
    </div>
  );
}

/** Logo + short name, bottom-left, 70 % opacity (rule 14). Kematian: name only, no accent (rule 7). */
function BrandChip({ s, sober }: { s: DisplayState; sober: boolean }) {
  return (
    <div
      data-brand-chip
      style={{ position: "absolute", left: CHIP_MARGIN, bottom: CHIP_MARGIN, display: "flex", alignItems: "center", gap: 12, padding: sober ? "12px 22px" : "8px 22px 8px 12px", borderRadius: 999, background: bgOf(s), color: G.text, opacity: 0.7, fontSize: 22, fontWeight: 700 }}
    >
      {!sober && <Logo masjid={s.masjid} size={40} dot={accent(s)} />}
      {s.masjid.shortName}
    </div>
  );
}

/** Rule 17: calm cream card on the phase colour; no prayer data. */
function PosterEmpty({ s }: { s: DisplayState }) {
  return (
    <div data-empty style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 1100, boxSizing: "border-box", padding: "96px 110px", borderRadius: 39, background: G.card, color: G.cardInk, display: "flex", flexDirection: "column", alignItems: "center", gap: 28, textAlign: "center" }}>
        <Logo masjid={s.masjid} size={140} dot={G.cardAccent} color={G.cardInk} />
        <div style={{ ...serif, fontSize: 60, fontWeight: 600, lineHeight: 1.12 }}>{s.masjid.fullName}</div>
        <div style={{ fontSize: 32, fontWeight: 500, color: G.cardMuted }}>{EMPTY_TEXT}</div>
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
          <div data-poster-area style={{ position: "absolute", inset: 0, overflow: "hidden", background: G.card }}>
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
