"use client";
// Tenang layouts: full (designs/F-Full), bottom (F-Bottom), side (F-Side).
import type { DisplayState, WaktuView } from "@/core";
import type { CSSProperties, FC } from "react";
import type { LayoutProps, SlideView, TemplateArea } from "../types";
import { CrossFade } from "../shared/crossfade";
import { CHIP_MARGIN, EMPTY_TEXT, FitBox, templateAreaOf } from "../shared/poster";
import { AreaContext, Arabic, Dot, Logo, Page, tickerItem, tokensOf, type Area } from "./parts";
import { FridayStrip } from "./friday";
import { TenangPoster } from "./poster";
import { tenangTemplates } from "./templates";
import { SHADOW_CARD, SHADOW_PILL, type TenangTokens } from "./tokens";

const num = { fontVariantNumeric: "tabular-nums" } as const;

/** "Asar dalam 2 jam 51 minit", or just the next name when the time is unknown. */
const countdownLine = (s: DisplayState) => (s.countdownText ? `${s.next.label} dalam ${s.countdownText}` : `${s.next.label} seterusnya`);

/** Current = white floating pill, name 800, time 700 in accent. Everything else 500 (contract section 5). */
function pill(t: TenangTokens, w: WaktuView, lite: boolean) {
  const cur = w.state === "current";
  return {
    background: cur ? t.pill : "transparent",
    boxShadow: cur && !lite ? SHADOW_PILL : "none",
    nameWeight: cur ? 800 : 500,
    timeWeight: cur ? 700 : 500,
    timeColor: cur ? t.accent : t.fg,
  };
}

/** One slide in the card, as on the TV. Exported for the landing page's template thumbnails. */
export function SlideBody({ s, slide, area }: { s: DisplayState; slide?: SlideView; area: Area }) {
  if (slide?.kind === "poster") return <TenangPoster s={s} imageUrl={slide.imageUrl} />;
  if (slide?.kind !== "template") return null;
  const T = tenangTemplates[slide.template] as FC<{ s: DisplayState; fields: unknown; area: TemplateArea }>;
  return (
    <div style={{ height: "100%", boxSizing: "border-box", background: tokensOf(s).card, padding: area === "wide" ? "88px 110px" : "80px 90px" }}>
      <AreaContext.Provider value={area}>
        <T s={s} fields={slide.fields} area={templateAreaOf(area)} />
      </AreaContext.Provider>
    </div>
  );
}

/** "2 / 6" in a quiet pill, top-right of the card. */
function Counter({ t, counter }: { t: TenangTokens; counter?: LayoutProps["counter"] }) {
  if (!counter || counter.total < 2) return null;
  return (
    <div data-counter style={{ position: "absolute", top: 24, right: 28, padding: "8px 16px", borderRadius: 999, background: t.bg, color: t.muted, fontSize: 20, fontWeight: 600, ...num }}>
      {counter.position} / {counter.total}
    </div>
  );
}

function Card({ t, s, slide, slideKey, counter, area, style }: LayoutProps & { t: TenangTokens; area: Area; style: CSSProperties }) {
  return (
    <div data-poster-area style={{ position: "absolute", borderRadius: 40, background: t.card, color: t.fg, boxShadow: s.lite ? "none" : SHADOW_CARD, overflow: "hidden", ...style }}>
      <CrossFade id={slideKey ?? "slide"} lite={s.lite}>
        <SlideBody s={s} slide={slide} area={area} />
      </CrossFade>
      <Counter t={t} counter={counter} />
    </div>
  );
}

export function FullLayout({ s }: LayoutProps) {
  const t = tokensOf(s);
  const curIdx = s.waktu.findIndex((w) => w.state === "current");
  const ticker = tickerItem(s);
  return (
    <Page t={t}>
      <div style={{ position: "absolute", top: 72, left: 112, right: 112, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Logo masjid={s.masjid} size={52} color={t.fg} />
          <div style={{ fontSize: 28, fontWeight: 500 }}>{s.masjid.fullName}</div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 500, color: t.muted }}>
          {s.gregorian} · {s.hijri}
        </div>
      </div>

      <div style={{ position: "absolute", top: 0, bottom: 0, left: 112, width: 780, display: "flex", flexDirection: "column", justifyContent: "center", gap: 36 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{ fontSize: 280, fontWeight: 300, letterSpacing: -10, lineHeight: 0.85, ...num }}>{s.clock}</div>
          <div style={{ fontSize: 56, fontWeight: 400, color: t.muted, ...num }}>{s.seconds}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {s.current && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 36, fontWeight: 600, color: t.accent }}>
              <Dot color={t.accent} size={14} />
              Waktu {s.current.label}
            </div>
          )}
          <div style={{ fontSize: 30, fontWeight: 500, color: t.muted }}>{countdownLine(s)}</div>
        </div>
        <FridayStrip s={s} variant="card" style={{ maxWidth: 780 }} />
      </div>

      <div style={{ position: "absolute", top: 0, bottom: 0, right: 112, width: 760, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {s.waktu.map((w, i) => {
          const p = pill(t, w, s.lite);
          const noRule = i === curIdx || i === curIdx - 1 || i === s.waktu.length - 1;
          return (
            <div
              key={w.key}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto 200px",
                alignItems: "center",
                gap: 28,
                height: 100,
                padding: "0 40px",
                borderRadius: 999,
                background: p.background,
                boxShadow: p.boxShadow,
                borderBottom: `1px solid ${noRule ? "transparent" : t.rule}`,
              }}
            >
              <div style={{ fontSize: 38, fontWeight: p.nameWeight }}>{w.label}</div>
              <div>{s.showArabic && <Arabic style={{ fontSize: 30, fontWeight: 500, color: t.muted }}>{w.arabic}</Arabic>}</div>
              <div style={{ fontSize: 62, fontWeight: p.timeWeight, letterSpacing: -2, textAlign: "right", color: p.timeColor, ...num }}>{w.time}</div>
            </div>
          );
        })}
      </div>

      {ticker && (
        <div
          style={{
            position: "absolute",
            left: 112,
            right: 112,
            bottom: 56,
            paddingTop: 20,
            borderTop: `1px solid ${t.rule}`,
            fontSize: 26,
            fontWeight: 500,
            color: t.muted,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {ticker}
        </div>
      )}
    </Page>
  );
}

export function BottomLayout({ s, slide, slideKey, counter }: LayoutProps) {
  const t = tokensOf(s);
  return (
    <Page t={t}>
      <Card t={t} s={s} slide={slide} slideKey={slideKey} counter={counter} area="wide" style={{ top: 56, left: 96, right: 96, height: 670 }} />

      <FridayStrip s={s} variant="pill" style={{ position: "absolute", left: 96, top: 736, height: 44 }} />
      <div style={{ position: "absolute", left: 96, right: 96, bottom: s.friday ? 40 : 56, height: 250, display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: 40, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, lineHeight: 1.15 }}>
          <div style={{ fontSize: 22, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>{s.masjid.fullName}</div>
          <div style={{ fontSize: 132, fontWeight: 300, letterSpacing: -6, lineHeight: 0.9, marginBottom: 6, ...num }}>{s.clock}</div>
          <div style={{ fontSize: 21, fontWeight: 500, color: t.muted }}>{s.gregorian}</div>
          <div style={{ fontSize: 21, fontWeight: 500, color: t.muted }}>{s.hijri}</div>
          <div style={{ fontSize: 21, fontWeight: 600, color: t.accent, whiteSpace: "nowrap" }}>{countdownLine(s)}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8, height: 190 }}>
          {s.waktu.map((w) => {
            const p = pill(t, w, s.lite);
            const cur = w.state === "current";
            return (
              <div
                key={w.key}
                style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 10, borderRadius: 32, background: p.background, boxShadow: p.boxShadow }}
              >
                <div style={{ fontSize: 26, fontWeight: p.nameWeight, color: cur ? t.accent : t.muted }}>{w.label}</div>
                <div style={{ fontSize: 58, fontWeight: p.timeWeight, letterSpacing: -2, lineHeight: 1, color: p.timeColor, ...num }}>{w.time}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Page>
  );
}

export function SideLayout({ s, slide, slideKey, counter }: LayoutProps) {
  const t = tokensOf(s);
  return (
    <Page t={t}>
      <Card t={t} s={s} slide={slide} slideKey={slideKey} counter={counter} area="tall" style={{ top: 56, bottom: 56, left: 72, width: 1200 }} />

      <div style={{ position: "absolute", top: 56, bottom: 56, right: 72, width: 520, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Logo masjid={s.masjid} size={44} color={t.fg} />
          <div style={{ fontSize: 24, fontWeight: 500 }}>{s.masjid.fullName}</div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 500, color: t.muted, marginTop: 10 }}>
          {s.gregorian} · {s.hijri}
        </div>
        <div style={{ fontSize: 168, fontWeight: 300, letterSpacing: -8, lineHeight: 0.9, marginTop: 34, ...num }}>{s.clock}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, fontWeight: 600, color: t.accent, marginTop: 12 }}>
          <Dot color={t.accent} size={10} />
          {countdownLine(s)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          {s.waktu.map((w) => {
            const p = pill(t, w, s.lite);
            return (
              <div key={w.key} style={{ display: "flex", alignItems: "center", height: s.friday ? 66 : 82, padding: "0 30px", borderRadius: 999, background: p.background, boxShadow: p.boxShadow }}>
                <div style={{ fontSize: 32, fontWeight: p.nameWeight }}>{w.label}</div>
                <div style={{ marginLeft: "auto", fontSize: s.friday ? 50 : 54, fontWeight: p.timeWeight, letterSpacing: -2, color: p.timeColor, ...num }}>{w.time}</div>
              </div>
            );
          })}
        </div>
        <FridayStrip s={s} variant="card" style={{ marginTop: 16 }} />
      </div>
    </Page>
  );
}
// ------------------------------------------------------------------ poster (announcement-only)

/** Content box of the side (5:4) card: 1200×968 minus its 80/90 px padding. Scaled up to fill 16:9. */
const POSTER_CONTENT = { w: 1020, h: 808 };

function PosterSlide({ s, slide }: { s: DisplayState; slide: SlideView }) {
  if (slide.kind === "poster") return <TenangPoster s={s} imageUrl={slide.imageUrl} />;
  const T = tenangTemplates[slide.template] as FC<{ s: DisplayState; fields: unknown; area: TemplateArea }>;
  return (
    <FitBox w={POSTER_CONTENT.w} h={POSTER_CONTENT.h}>
      <AreaContext.Provider value="tall">
        <T s={s} fields={slide.fields} area="poster" />
      </AreaContext.Provider>
    </FitBox>
  );
}

/** Logo + short name, bottom-left, 70 % opacity (rule 14). Kematian: name only, no accent (rule 7). */
function BrandChip({ s, t, sober }: { s: DisplayState; t: TenangTokens; sober: boolean }) {
  return (
    <div
      data-brand-chip
      style={{ position: "absolute", left: CHIP_MARGIN, bottom: CHIP_MARGIN, display: "flex", alignItems: "center", gap: 12, padding: sober ? "12px 22px" : "8px 22px 8px 8px", borderRadius: 999, background: t.bg, color: sober ? t.muted : t.fg, opacity: 0.7, fontSize: 22, fontWeight: 600 }}
    >
      {!sober && <Logo masjid={s.masjid} size={40} color={t.accent} />}
      {s.masjid.shortName}
    </div>
  );
}

/** Rule 17: calm card, no prayer data. */
function PosterEmpty({ s, t }: { s: DisplayState; t: TenangTokens }) {
  return (
    <div data-empty style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 1100, boxSizing: "border-box", padding: "96px 110px", borderRadius: 40, background: t.card, boxShadow: s.lite ? "none" : SHADOW_CARD, display: "flex", flexDirection: "column", alignItems: "center", gap: 28, textAlign: "center" }}>
        <Logo masjid={s.masjid} size={140} color={t.accent} />
        <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1, lineHeight: 1.15 }}>{s.masjid.fullName}</div>
        <div style={{ fontSize: 32, fontWeight: 500, color: t.muted }}>{EMPTY_TEXT}</div>
      </div>
    </div>
  );
}

/** Announcement-only screen (contract rules 14–17): the slide edge-to-edge, nothing about prayer times. */
export function PosterLayout({ s, slide, slideKey }: LayoutProps) {
  const t = tokensOf(s);
  if (!slide) {
    return (
      <Page t={t}>
        <PosterEmpty s={s} t={t} />
      </Page>
    );
  }
  return (
    <Page t={t}>
      <div data-poster-area style={{ position: "absolute", inset: 0, background: t.card, color: t.fg, overflow: "hidden" }}>
        <CrossFade id={slideKey ?? "slide"} lite={s.lite}>
          <PosterSlide s={s} slide={slide} />
        </CrossFade>
      </div>
      <BrandChip s={s} t={t} sober={slide.kind === "template" && slide.template === "kematian"} />
    </Page>
  );
}
