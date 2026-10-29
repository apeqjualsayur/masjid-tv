"use client";
// Serambi layouts: full (designs/D-Full), bottom (D-Bottom), side (D-Side).
import type { DisplayState } from "@/core";
import type { CSSProperties, FC } from "react";
import type { LayoutProps, SlideView, TemplateArea } from "../types";
import { CHIP_MARGIN, EMPTY_TEXT, FitBox, templateAreaOf } from "../shared/poster";
import {
  AreaContext,
  ArchWindow,
  Caps,
  Chip,
  Kufi,
  Logo,
  Page,
  ambientGlow,
  archLook,
  countdownLine,
  numStyle,
  type Area,
} from "./parts";
import { CrossFade } from "../shared/crossfade";
import { TICKER_LABEL, tickerNow } from "../shared/ticker";
import { FridayStrip } from "./friday";
import { SerambiPoster } from "./poster";
import { serambiTemplates } from "./templates";
import { ARCH_OVERLAY, ARCH_OVERLAY_SMALL, C, SKY, archRadius } from "./tokens";

/** Ambient glow behind the arcade in the current arch's colour. Removed in lite mode. */
function Ambient({ s }: { s: DisplayState }) {
  if (s.lite) return null;
  return (
    <div
      data-ambient
      style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 60% at 50% 100%, ${ambientGlow(s)} 0%, rgba(11,17,20,0) 70%)`, opacity: 0.45 }}
    />
  );
}

function TemplateBody({ s, slide, area }: { s: DisplayState; slide: Extract<SlideView, { kind: "template" }>; area: TemplateArea }) {
  const T = serambiTemplates[slide.template] as FC<{ s: DisplayState; fields: unknown; area: TemplateArea }>;
  return <T s={s} fields={slide.fields} area={area} />;
}

/** One slide's full layer. Wide: emerald panel. Tall: big gold arch frame. Kematian: plain and sober in both. */
function SlideLayer({ s, slide, area }: { s: DisplayState; slide?: SlideView; area: Area }) {
  if (slide?.kind === "poster") return <SerambiPoster s={s} imageUrl={slide.imageUrl} />;
  const sober = slide?.kind === "template" && slide.template === "kematian";
  const body = slide?.kind === "template" ? <TemplateBody s={s} slide={slide} area={templateAreaOf(area)} /> : null;
  if (area === "wide") {
    return (
      <div style={{ position: "absolute", inset: 0, boxSizing: "border-box", padding: "64px 110px", background: sober ? C.sidebar : C.emerald }}>
        <AreaContext.Provider value="wide">{body}</AreaContext.Provider>
      </div>
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: sober ? C.bg : `radial-gradient(ellipse 60% 70% at 50% 60%, ${C.emerald2} 0%, ${C.bg} 75%)`,
      }}
    >
      <div
        style={{
          width: 920,
          height: 960,
          boxSizing: "border-box",
          border: sober ? "none" : "2px solid rgba(227,176,75,0.8)",
          borderRadius: sober ? 28 : archRadius(920, 28),
          background: sober ? C.sidebar : "transparent",
          padding: sober ? "80px 90px" : "200px 90px 80px",
        }}
      >
        <AreaContext.Provider value="tall">{body}</AreaContext.Provider>
      </div>
    </div>
  );
}

/** "2 / 6" chip, top-right of the slide area. */
function Counter({ counter }: { counter?: LayoutProps["counter"] }) {
  if (!counter || counter.total < 2) return null;
  return (
    <div
      data-counter
      style={{ position: "absolute", top: 24, right: 24, padding: "6px 16px", borderRadius: 999, background: C.chipDark, border: "1px solid rgba(227,176,75,0.4)", color: C.gold, fontSize: 20, fontWeight: 700, ...numStyle }}
    >
      {counter.position} / {counter.total}
    </div>
  );
}

function SlideArea({ s, slide, slideKey, counter, area, style }: LayoutProps & { area: Area; style: CSSProperties }) {
  return (
    <div data-poster-area style={{ position: "absolute", overflow: "hidden", background: C.bg, ...style }}>
      <CrossFade id={slideKey ?? "slide"} lite={s.lite}>
        <SlideLayer s={s} slide={slide} area={area} />
      </CrossFade>
      <Counter counter={counter} />
    </div>
  );
}
export function FullLayout({ s }: LayoutProps) {
  const ticker = tickerNow(s);
  const lift = ticker ? 48 : 0; // room for the ticker under the gold line (rule 20)
  return (
    <Page>
      <Ambient s={s} />

      <div style={{ position: "absolute", top: 52, left: 72, right: 72, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Logo masjid={s.masjid} size={70} />
          <div style={{ fontSize: 34, fontWeight: 600 }}>{s.masjid.fullName}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ fontSize: 28, fontWeight: 500 }}>{s.gregorian}</div>
          <div style={{ fontSize: 24, fontWeight: 500, color: C.gold }}>{s.hijri}</div>
        </div>
      </div>

      <div style={{ position: "absolute", top: 148, left: 72, right: 72, height: 230, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <div style={{ ...numStyle, fontSize: 236, fontWeight: 600, letterSpacing: -4, lineHeight: 0.82 }}>{s.clock}</div>
          <div style={{ ...numStyle, fontSize: 76, fontWeight: 500, color: C.gold }}>{s.seconds}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, paddingBottom: 6 }}>
          <Caps>Seterusnya</Caps>
          <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
            {s.showArabic && <Kufi style={{ fontSize: 54, color: "rgba(255,255,255,0.7)" }}>{s.next.arabic}</Kufi>}
            <div style={{ ...numStyle, fontSize: 104, fontWeight: 600, lineHeight: 0.9 }}>
              {s.next.label} {s.next.time}
            </div>
          </div>
          {s.countdownText && <div style={{ fontSize: 30, fontWeight: 400, color: "rgba(255,255,255,0.65)" }}>{s.countdownText} lagi</div>}
        </div>
      </div>

      <FridayStrip s={s} style={{ position: "absolute", top: 394, right: 72, height: 46 }} />

      <div style={{ position: "absolute", left: 72, right: 72, bottom: 64 + lift, height: 620 - lift, display: "flex", alignItems: "flex-end", gap: 20 }}>
        {s.waktu.map((w) => {
          const cur = w.state === "current";
          const h = (s.friday ? 60 : 0) + lift;
          return (
            <ArchWindow key={w.key} w={w} width={236} height={(cur ? 620 : 560) - h} overlay={ARCH_OVERLAY} look={archLook(w, 70, s.lite)}>
              {(cur || w.state === "next") && (
                <div style={{ position: "absolute", top: 132, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
                  <Chip current={cur}>{cur ? "SEKARANG" : "SETERUSNYA"}</Chip>
                </div>
              )}
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 20px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}>
                {s.showArabic && <Kufi style={{ fontSize: 28, opacity: 0.85 }}>{w.arabic}</Kufi>}
                <div style={{ fontSize: 34, fontWeight: 600 }}>{w.label}</div>
                <div style={{ ...numStyle, fontSize: 78, fontWeight: 600, lineHeight: 0.95 }}>{w.time}</div>
              </div>
            </ArchWindow>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 72, right: 72, bottom: 44 + lift, height: 2, background: C.goldLine }} />
      {ticker && (
        <div data-ticker style={{ position: "absolute", left: 72, right: 72, bottom: 24, height: 48, display: "flex", alignItems: "center", gap: 24 }}>
          <Caps size={20} spacing={0.2} weight={700}>
            {TICKER_LABEL}
          </Caps>
          <div style={{ flex: 1, minWidth: 0, fontSize: 28, fontWeight: 500, color: C.soft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ticker}</div>
        </div>
      )}
    </Page>
  );
}

/** Bottom-bar arch width: (1920 - 2*64 - 360 - 40 - 6*14) / 7, rounded down. */
const BOTTOM_ARCH_W = 186;

export function BottomLayout({ s, slide, slideKey, counter }: LayoutProps) {
  return (
    <Page>
      <SlideArea s={s} slide={slide} slideKey={slideKey} counter={counter} area="wide" style={{ top: 0, left: 0, right: 0, height: 730 }} />

      <FridayStrip s={s} style={{ position: "absolute", left: 64, top: 742, height: 44 }} />
      <div style={{ position: "absolute", left: 64, right: 64, bottom: s.friday ? 16 : 36, height: 310, display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: 40, alignItems: "end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 6, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Logo masjid={s.masjid} size={40} />
            <div style={{ fontSize: 22, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.masjid.fullName}</div>
          </div>
          <div style={{ ...numStyle, fontSize: 136, fontWeight: 600, letterSpacing: -2, lineHeight: 0.88 }}>{s.clock}</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: C.gold, whiteSpace: "nowrap" }}>{countdownLine(s)}</div>
          <div style={{ fontSize: 19, fontWeight: 400, color: C.muted, lineHeight: 1.3 }}>
            {s.gregorian}
            <br />
            {s.hijri}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
          {s.waktu.map((w) => {
            const cur = w.state === "current";
            return (
              <ArchWindow key={w.key} w={w} width={BOTTOM_ARCH_W} height={s.friday ? (cur ? 262 : 222) : cur ? 300 : 250} bottomRadius={14} overlay={ARCH_OVERLAY_SMALL} look={archLook(w, 50, s.lite)}>
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 10px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  {cur && (
                    <div style={{ marginBottom: 8 }}>
                      <Chip current size={13}>
                        SEKARANG
                      </Chip>
                    </div>
                  )}
                  <div style={{ fontSize: 26, fontWeight: 600 }}>{w.label}</div>
                  <div style={{ ...numStyle, fontSize: 62, fontWeight: 600, lineHeight: 0.95 }}>{w.time}</div>
                </div>
              </ArchWindow>
            );
          })}
        </div>
      </div>
    </Page>
  );
}

export function SideLayout({ s, slide, slideKey, counter }: LayoutProps) {
  return (
    <Page>
      <SlideArea s={s} slide={slide} slideKey={slideKey} counter={counter} area="tall" style={{ top: 0, bottom: 0, left: 0, width: 1320 }} />

      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: 600,
          boxSizing: "border-box",
          padding: "48px 44px",
          background: C.sidebar,
          borderLeft: "1px solid rgba(227,176,75,0.3)",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Logo masjid={s.masjid} size={58} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.15 }}>{s.masjid.fullName}</div>
            <div style={{ fontSize: 19, fontWeight: 400, color: C.muted }}>
              {s.gregorian} · <span style={{ color: C.gold }}>{s.hijri}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ ...numStyle, fontSize: 170, fontWeight: 600, letterSpacing: -3, lineHeight: 0.82 }}>{s.clock}</div>
            <div style={{ ...numStyle, fontSize: 54, fontWeight: 500, color: C.gold }}>{s.seconds}</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 500, color: C.gold }}>{countdownLine(s)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
          {s.waktu.map((w) => {
            const cur = w.state === "current";
            return (
              <div
                key={w.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  height: s.friday ? 60 : 78,
                  boxSizing: "border-box",
                  padding: "0 20px 0 14px",
                  borderRadius: 18,
                  background: cur ? "rgba(227,176,75,0.14)" : "transparent",
                  border: cur ? `2px solid ${C.gold}` : w.state === "next" ? "1px solid rgba(227,176,75,0.4)" : "1px solid transparent",
                  opacity: w.state === "past" ? 0.42 : 1,
                }}
              >
                <div data-arch={w.key} style={{ width: 38, height: 54, flex: "none", borderRadius: archRadius(38, 6), background: SKY[w.key].sky }} />
                <div style={{ fontSize: 34, fontWeight: cur ? 700 : 500 }}>{w.label}</div>
                {cur && (
                  <Chip current size={13}>
                    SEKARANG
                  </Chip>
                )}
                <div style={{ marginLeft: "auto", ...numStyle, fontSize: s.friday ? 56 : 62, fontWeight: 600, color: cur ? C.gold : C.white }}>{w.time}</div>
              </div>
            );
          })}
        </div>
        <FridayStrip s={s} variant="card" />
      </div>
    </Page>
  );
}
// ------------------------------------------------------------------ poster (announcement-only)

/** Content box inside the side (5:4) arch: 920×960 minus its 200/90/80 px padding. Scaled up to fill 16:9. */
const POSTER_CONTENT = { w: 740, h: 680 };

function PosterSlide({ s, slide }: { s: DisplayState; slide: SlideView }) {
  if (slide.kind === "poster") return <SerambiPoster s={s} imageUrl={slide.imageUrl} />;
  const sober = slide.template === "kematian";
  // Emerald panel edge-to-edge; no arch frame around the slide (rule 14). Kematian: plain dark.
  return (
    <div style={{ position: "absolute", inset: 0, background: sober ? C.sidebar : C.emerald }}>
      <FitBox w={POSTER_CONTENT.w} h={POSTER_CONTENT.h}>
        <AreaContext.Provider value="tall">
          <TemplateBody s={s} slide={slide} area="poster" />
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
      style={{ position: "absolute", left: CHIP_MARGIN, bottom: CHIP_MARGIN, display: "flex", alignItems: "center", gap: 12, padding: sober ? "12px 22px" : "8px 22px 8px 8px", borderRadius: 999, background: C.chipDark, border: `1px solid ${sober ? C.divider : C.goldLine}`, color: sober ? C.muted : C.gold, opacity: 0.7, fontSize: 22, fontWeight: 600 }}
    >
      {!sober && <Logo masjid={s.masjid} size={40} />}
      {s.masjid.shortName}
    </div>
  );
}

/** Rule 17: one calm panel with a gold hairline; no prayer data. */
function PosterEmpty({ s }: { s: DisplayState }) {
  return (
    <div data-empty style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: s.lite ? C.bg : `radial-gradient(ellipse 60% 70% at 50% 55%, ${C.emerald2} 0%, ${C.bg} 75%)` }}>
      <div style={{ width: 1100, boxSizing: "border-box", padding: "96px 110px", borderRadius: 28, background: C.sidebar, border: `1px solid ${C.goldLine}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 28, textAlign: "center" }}>
        <Logo masjid={s.masjid} size={140} />
        <div style={{ fontSize: 56, fontWeight: 600, lineHeight: 1.15, color: C.white }}>{s.masjid.fullName}</div>
        <div style={{ fontSize: 32, fontWeight: 500, color: C.muted }}>{EMPTY_TEXT}</div>
      </div>
    </div>
  );
}

/** Announcement-only screen (contract rules 14–17): the slide edge-to-edge, nothing about prayer times. */
export function PosterLayout({ s, slide, slideKey }: LayoutProps) {
  if (!slide) {
    return (
      <Page>
        <PosterEmpty s={s} />
      </Page>
    );
  }
  return (
    <Page>
      <div data-poster-area style={{ position: "absolute", inset: 0, overflow: "hidden", background: C.bg }}>
        <CrossFade id={slideKey ?? "slide"} lite={s.lite}>
          <PosterSlide s={s} slide={slide} />
        </CrossFade>
      </div>
      <BrandChip s={s} sober={slide.kind === "template" && slide.template === "kematian"} />
    </Page>
  );
}
