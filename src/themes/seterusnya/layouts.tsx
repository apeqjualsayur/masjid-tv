"use client";
// Seterusnya layouts: full (designs/K-Full: hero for the next waktu, ring, strip of 7), bottom (round-2
// common bottom: poster 1824×760 on top, compact hero + ring + 7 cells below), side (K-Side: text-only
// hero, azan + iqamah columns), poster (rules 14–17). Sizes = mockups ×1.5.
import { countdownRing, type DisplayState, type WaktuView } from "@/core";
import type { CSSProperties, FC } from "react";
import { CrossFade } from "../shared/crossfade";
import { CHIP_MARGIN, EMPTY_TEXT, FitBox, templateAreaOf } from "../shared/poster";
import { TICKER_LABEL, tickerNow } from "../shared/ticker";
import type { LayoutProps, SlideView, TemplateArea } from "../types";
import { FridayStrip } from "./friday";
import { AreaContext, Caps, Logo, Page, Ring, WaktuCell, bgOf, cellLook, num, secondTime, type Area, type CellSize } from "./parts";
import { SeterusnyaPoster } from "./poster";
import { seterusnyaTemplates } from "./templates";
import { S } from "./tokens";

/** Poster boxes (contract rule 10 / round-2 common Bottom; Side 5:4). */
export const AREA = {
  bottom: { x: 48, y: 24, w: 1824, h: 760 },
  side: { x: 60, y: 60, w: 1200, h: 960 },
} as const;
const CARD_PAD = { wide: "72px 84px", tall: "66px 78px" } as const;

/** One slide on the white card (or a poster image). */
export function SlideBody({ s, slide, area }: { s: DisplayState; slide?: SlideView; area: Area }) {
  if (slide?.kind === "poster") return <SeterusnyaPoster s={s} imageUrl={slide.imageUrl} />;
  if (slide?.kind !== "template") return null;
  const T = seterusnyaTemplates[slide.template] as FC<{ s: DisplayState; fields: unknown; area: TemplateArea }>;
  return (
    <div style={{ height: "100%", boxSizing: "border-box", background: S.card, color: S.cardInk, padding: CARD_PAD[area] }}>
      <AreaContext.Provider value={area}>
        <T s={s} fields={slide.fields} area={templateAreaOf(area)} />
      </AreaContext.Provider>
    </div>
  );
}

function Counter({ counter }: { counter?: LayoutProps["counter"] }) {
  if (!counter || counter.total < 2) return null;
  return (
    <div data-counter style={{ position: "absolute", top: 24, right: 28, padding: "8px 18px", borderRadius: 999, background: S.cardInk, color: S.card, fontSize: 21, fontWeight: 700, ...num }}>
      {counter.position} / {counter.total}
    </div>
  );
}

function Card({ s, slide, slideKey, counter, area, style }: LayoutProps & { area: Area; style: CSSProperties }) {
  return (
    <div data-poster-area style={{ position: "absolute", borderRadius: 39, background: S.card, overflow: "hidden", ...style }}>
      <CrossFade id={slideKey ?? "slide"} lite={s.lite}>
        <SlideBody s={s} slide={slide} area={area} />
      </CrossFade>
      <Counter counter={counter} />
    </div>
  );
}

/** Azan time and the iqamah (or Jumaat khutbah) time of the hero, side by side. */
function HeroTimes({ s, size, label, gap }: { s: DisplayState; size: number; label: number; gap: number }) {
  const second = secondTime(s.next, s);
  const col = (k: string, v: string, weight: number, key: string) => (
    <div data-hero={key} style={{ display: "flex", flexDirection: "column" }}>
      <Caps size={label}>{k}</Caps>
      <div style={{ fontSize: size, fontWeight: weight, lineHeight: 1, whiteSpace: "nowrap", ...num }}>{v}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", gap }}>
      {col("Azan", s.next.time, 700, "azan")}
      {second && col(second.kind === "iqamah" ? "Iqamah" : "Khutbah", second.time, 300, second.kind)}
    </div>
  );
}

const heroName: CSSProperties = { fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", textTransform: "uppercase", whiteSpace: "nowrap" };

// ------------------------------------------------------------------ full

const FULL_CELL: CellSize = { name: 25.5, time: 54, small: 21, radius: 24 };

export function FullLayout({ s }: LayoutProps) {
  const ticker = tickerNow(s);
  const ring = countdownRing(s, 1000); // once a second (contract §9)
  return (
    <Page s={s} style={{ boxSizing: "border-box", padding: `54px 96px ${ticker ? 51 + 72 : 51}px`, display: "flex", flexDirection: "column", gap: 21 }}>
      <div style={{ height: 96, flex: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 21 }}>
          <Logo masjid={s.masjid} size={54} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.15 }}>{s.masjid.fullName}</div>
            <div style={{ fontSize: 22.5 }}>
              {s.gregorian} · {s.hijri}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
          {s.current && <Caps size={22.5} spacing="0.16em">Waktu {s.current.label}</Caps>}
          <div style={{ fontSize: 87, fontWeight: 300, lineHeight: 1, ...num }}>{s.clock}</div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", gap: 54 }}>
        <div data-hero-block style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 9 }}>
          <Caps size={30} spacing="0.26em">
            Seterusnya
          </Caps>
          <div data-hero-name style={{ ...heroName, fontSize: 198 }}>{s.next.label}</div>
          <div style={{ marginTop: 15 }}>
            <HeroTimes s={s} size={138} label={24} gap={96} />
          </div>
          <FridayStrip s={s} variant="pill" style={{ marginTop: 24, alignSelf: "flex-start" }} />
        </div>
        <Ring size={510} stroke={27} remaining={ring.remaining}>
          <div style={{ fontSize: 93, fontWeight: 700, lineHeight: 1, ...num }}>{ring.label}</div>
          <div style={{ fontSize: 27, marginTop: 9 }}>lagi ke {s.next.label}</div>
        </Ring>
      </div>
      <div style={{ height: 168, flex: "none", display: "flex", gap: 15 }}>
        {s.waktu.map((w) => (
          <WaktuCell key={w.key} w={w} s={s} size={FULL_CELL} />
        ))}
      </div>
      {ticker && (
        <div data-ticker style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 72, boxSizing: "border-box", padding: "0 96px", background: S.band, display: "flex", alignItems: "center", gap: 24 }}>
          <Caps size={21} spacing="0.16em">
            {TICKER_LABEL}
          </Caps>
          <div style={{ flex: 1, minWidth: 0, fontSize: 28, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ticker}</div>
        </div>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ bottom

const BOTTOM_CELL: CellSize = { name: 21, time: 48, small: 19.5, radius: 21 };

export function BottomLayout({ s, slide, slideKey, counter }: LayoutProps) {
  const fri = Boolean(s.friday);
  const top = fri ? 852 : 808; // the Friday pill takes the top edge of the bar; the poster keeps its size
  const ring = countdownRing(s, 60_000); // once a minute (contract §9)
  return (
    <Page s={s}>
      <Card s={s} slide={slide} slideKey={slideKey} counter={counter} area="wide" style={{ left: AREA.bottom.x, top: AREA.bottom.y, width: AREA.bottom.w, height: AREA.bottom.h }} />
      <FridayStrip s={s} variant="pill" style={{ position: "absolute", left: 48, top: 800, height: 44 }} />
      <div style={{ position: "absolute", left: 48, right: 48, top, bottom: 24, display: "flex", alignItems: "center", gap: 27 }}>
        <Ring size={fri ? 170 : 200} stroke={fri ? 9 : 11} remaining={ring.remaining}>
          <div style={{ fontSize: fri ? 30 : 34, fontWeight: 700, lineHeight: 1, ...num }}>{ring.label}</div>
        </Ring>
        <div data-hero-block style={{ width: 340, flex: "none", display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <div style={{ fontSize: 42, fontWeight: 300, lineHeight: 1, ...num }}>{s.clock}</div>
            {s.current && <Caps size={18} spacing="0.14em">Waktu {s.current.label}</Caps>}
          </div>
          <Caps size={19.5} spacing="0.26em" style={{ marginTop: 3 }}>
            Seterusnya
          </Caps>
          <div data-hero-name style={{ ...heroName, fontSize: fri ? 54 : 66 }}>{s.next.label}</div>
          <HeroTimes s={s} size={fri ? 46 : 54} label={18} gap={30} />
        </div>
        <div style={{ flex: 1, minWidth: 0, alignSelf: "stretch", display: "flex", gap: 9 }}>
          {s.waktu.map((w) => (
            <WaktuCell key={w.key} w={w} s={s} size={BOTTOM_CELL} />
          ))}
        </div>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ side

/** One row of the side list: name, azan, iqamah (or khutbah on Friday Zohor, "–" for markers). */
function SideRow({ w, s }: { w: WaktuView; s: DisplayState }) {
  const look = cellLook(w, s);
  const second = secondTime(w, s);
  return (
    <div
      data-cell={w.key}
      data-state={w.state}
      style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", padding: "0 21px", boxSizing: "border-box", borderRadius: 21, border: `3px solid ${look.border}`, background: look.background, color: look.color }}
    >
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", whiteSpace: "nowrap", lineHeight: 1.05 }}>
        <span style={{ fontSize: 31.5, fontWeight: look.name }}>{w.label}</span>
        {/* Friday Zohor: the second column holds the khutbah start, not an iqamah (rows are too short to stack it there) */}
        {second?.kind === "khutbah" && <span style={{ fontSize: 19.5, fontWeight: 700, letterSpacing: "0.1em" }}>KHUTBAH →</span>}
      </div>
      <div data-time style={{ width: 165, textAlign: "right", fontSize: 54, fontWeight: look.time, lineHeight: 1, ...num }}>
        {w.time}
      </div>
      <div data-second={second?.kind ?? "none"} style={{ width: 175, textAlign: "right", fontSize: second ? 54 : 36, fontWeight: 300, lineHeight: 1, ...num }}>
        {second ? second.time : "–"}
      </div>
    </div>
  );
}

export function SideLayout({ s, slide, slideKey, counter }: LayoutProps) {
  const fri = Boolean(s.friday);
  return (
    <Page s={s}>
      <Card s={s} slide={slide} slideKey={slideKey} counter={counter} area="tall" style={{ left: AREA.side.x, top: AREA.side.y, width: AREA.side.w, height: AREA.side.h }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 660, boxSizing: "border-box", padding: "39px 48px 33px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 15, minWidth: 0 }}>
            <Logo masjid={s.masjid} size={42} />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <div style={{ fontSize: 27, fontWeight: 700, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.masjid.fullName}</div>
              <div style={{ fontSize: 19.5, whiteSpace: "nowrap" }}>{s.gregorian}</div>
            </div>
          </div>
          <div style={{ fontSize: 60, fontWeight: 300, lineHeight: 1, flex: "none", ...num }}>{s.clock}</div>
        </div>
        <div data-hero-block style={{ display: "flex", flexDirection: "column", paddingTop: 9 }}>
          <Caps size={21} spacing="0.24em">
            Seterusnya
          </Caps>
          <div data-hero-name style={{ ...heroName, fontSize: fri ? 84 : 96, lineHeight: 1.05 }}>{s.next.label}</div>
          {s.countdownText && <div style={{ fontSize: 36, fontWeight: 500, ...num }}>dalam {s.countdownText}</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 24px" }}>
          <Caps size={19.5} spacing="0.18em" style={{ width: 165, textAlign: "right" }}>
            Azan
          </Caps>
          <Caps size={19.5} spacing="0.18em" style={{ width: 175, textAlign: "right" }}>
            Iqamah
          </Caps>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {s.waktu.map((w) => (
            <SideRow key={w.key} w={w} s={s} />
          ))}
        </div>
        <FridayStrip s={s} variant="card" />
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ poster (announcement-only)

/** Content box of the side (5:4) card: 1200×960 minus its 66/78 px padding. Scaled up to fill 16:9. */
const POSTER_CONTENT = { w: 1044, h: 828 };

function PosterSlide({ s, slide }: { s: DisplayState; slide: SlideView }) {
  if (slide.kind === "poster") return <SeterusnyaPoster s={s} imageUrl={slide.imageUrl} />;
  const T = seterusnyaTemplates[slide.template] as FC<{ s: DisplayState; fields: unknown; area: TemplateArea }>;
  return (
    <div style={{ position: "absolute", inset: 0, background: S.card, color: S.cardInk }}>
      <FitBox w={POSTER_CONTENT.w} h={POSTER_CONTENT.h}>
        <AreaContext.Provider value="tall">
          <T s={s} fields={slide.fields} area="poster" />
        </AreaContext.Provider>
      </FitBox>
    </div>
  );
}

/** Logo + short name, bottom-left, 70 % opacity (rule 14). Kematian: name only, neutral ink (rule 7). */
function BrandChip({ s, sober }: { s: DisplayState; sober: boolean }) {
  return (
    <div
      data-brand-chip
      style={{ position: "absolute", left: CHIP_MARGIN, bottom: CHIP_MARGIN, display: "flex", alignItems: "center", gap: 12, padding: sober ? "12px 22px" : "8px 22px 8px 14px", borderRadius: 999, background: sober ? S.cardInk : bgOf(s), color: S.text, opacity: 0.7, fontSize: 22, fontWeight: 700 }}
    >
      {!sober && <Logo masjid={s.masjid} size={40} />}
      {s.masjid.shortName}
    </div>
  );
}

/** Rule 17: calm white card on the phase colour; no prayer data. */
function PosterEmpty({ s }: { s: DisplayState }) {
  return (
    <div data-empty style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 1100, boxSizing: "border-box", padding: "96px 110px", borderRadius: 39, background: S.card, color: S.cardInk, display: "flex", flexDirection: "column", alignItems: "center", gap: 28, textAlign: "center" }}>
        <Logo masjid={s.masjid} size={140} color={bgOf(s)} />
        <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em" }}>{s.masjid.fullName}</div>
        <div style={{ fontSize: 32, fontWeight: 500, color: S.cardMuted }}>{EMPTY_TEXT}</div>
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
          <div data-poster-area style={{ position: "absolute", inset: 0, overflow: "hidden", background: S.card }}>
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
