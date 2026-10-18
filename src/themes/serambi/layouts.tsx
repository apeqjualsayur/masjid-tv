"use client";
// Serambi layouts: full (designs/D-Full), bottom (D-Bottom), side (D-Side).
import type { DisplayState } from "@/core";
import type { CSSProperties, FC } from "react";
import type { LayoutProps, SlideView } from "../types";
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

function TemplateBody({ s, slide }: { s: DisplayState; slide: Extract<SlideView, { kind: "template" }> }) {
  const T = serambiTemplates[slide.template] as FC<{ s: DisplayState; fields: unknown }>;
  return <T s={s} fields={slide.fields} />;
}

/** One slide's full layer. Wide: emerald panel. Tall: big gold arch frame. Kematian: plain and sober in both. */
function SlideLayer({ s, slide, area }: { s: DisplayState; slide?: SlideView; area: Area }) {
  if (slide?.kind === "poster") return <SerambiPoster s={s} imageUrl={slide.imageUrl} />;
  const sober = slide?.kind === "template" && slide.template === "kematian";
  const body = slide?.kind === "template" ? <TemplateBody s={s} slide={slide} /> : null;
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
    <div style={{ position: "absolute", overflow: "hidden", background: C.bg, ...style }}>
      <CrossFade id={slideKey ?? "slide"} lite={s.lite}>
        <SlideLayer s={s} slide={slide} area={area} />
      </CrossFade>
      <Counter counter={counter} />
    </div>
  );
}
export function FullLayout({ s }: LayoutProps) {
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

      <div style={{ position: "absolute", left: 72, right: 72, bottom: 64, height: 620, display: "flex", alignItems: "flex-end", gap: 20 }}>
        {s.waktu.map((w) => {
          const cur = w.state === "current";
          return (
            <ArchWindow key={w.key} w={w} width={236} height={cur ? 620 : 560} overlay={ARCH_OVERLAY} look={archLook(w, 70, s.lite)}>
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
      <div style={{ position: "absolute", left: 72, right: 72, bottom: 44, height: 2, background: C.goldLine }} />
    </Page>
  );
}

/** Bottom-bar arch width: (1920 - 2*64 - 360 - 40 - 6*14) / 7, rounded down. */
const BOTTOM_ARCH_W = 186;

export function BottomLayout({ s, slide, slideKey, counter }: LayoutProps) {
  return (
    <Page>
      <SlideArea s={s} slide={slide} slideKey={slideKey} counter={counter} area="wide" style={{ top: 0, left: 0, right: 0, height: 730 }} />

      <div style={{ position: "absolute", left: 64, right: 64, bottom: 36, height: 310, display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: 40, alignItems: "end" }}>
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
              <ArchWindow key={w.key} w={w} width={BOTTOM_ARCH_W} height={cur ? 300 : 250} bottomRadius={14} overlay={ARCH_OVERLAY_SMALL} look={archLook(w, 50, s.lite)}>
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
                  height: 78,
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
                <div style={{ marginLeft: "auto", ...numStyle, fontSize: 62, fontWeight: 600, color: cur ? C.gold : C.white }}>{w.time}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Page>
  );
}