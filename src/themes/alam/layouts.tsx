"use client";
// Alam layouts: full (designs/A-Full), bottom (A-Bottom), side (A-Side), all over the landscape.
import type { DisplayState } from "@/core";
import type { CSSProperties, FC } from "react";
import type { LayoutProps, SlideView } from "../types";
import { Landscape } from "./landscape";
import { AreaContext, Arabic, Logo, Page, StateChip, Star8, WaktuIcon, cardLook, countdownLine, num, type Area } from "./parts";
import { CrossFade } from "../shared/crossfade";
import { FridayStrip } from "./friday";
import { AlamPoster } from "./poster";
import { alamTemplates } from "./templates";
import { A, glass } from "./tokens";

/** One slide's layer: dark poster card or light announcement card. Kematian: no decoration. */
function SlideLayer({ s, slide, area }: { s: DisplayState; slide?: SlideView; area: Area }) {
  if (slide?.kind === "poster") {
    return (
      <div style={{ position: "absolute", inset: 0, background: "#0C1A16" }}>
        <AlamPoster s={s} imageUrl={slide.imageUrl} />
      </div>
    );
  }
  const sober = slide?.kind === "template" && slide.template === "kematian";
  const T = slide?.kind === "template" ? (alamTemplates[slide.template] as FC<{ s: DisplayState; fields: unknown }>) : null;
  return (
    <div style={{ position: "absolute", inset: 0, background: A.card, color: A.cardFg }}>
      {!sober && <Star8 size={560} color={A.green} opacity={0.08} circle style={{ top: -140, right: -140 }} />}
      <div style={{ position: "relative", height: "100%", boxSizing: "border-box", padding: "72px 80px" }}>
        <AreaContext.Provider value={area}>{T && slide?.kind === "template" ? <T s={s} fields={slide.fields} /> : null}</AreaContext.Provider>
      </div>
    </div>
  );
}

/** "2 / 6" glass pill, top-right of the card (designs/A-Side). */
function Counter({ s, counter }: { s: DisplayState; counter?: LayoutProps["counter"] }) {
  if (!counter || counter.total < 2) return null;
  return (
    <div
      data-counter
      style={{
        position: "absolute",
        top: 24,
        right: 24,
        padding: "10px 18px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.25)",
        background: s.lite ? A.glassLite : "rgba(8,18,28,0.5)",
        color: A.white,
        fontSize: 20,
        fontWeight: 700,
        ...num,
      }}
    >
      {counter.position} / {counter.total}
    </div>
  );
}

function SlideCard({ s, slide, slideKey, counter, area, style }: LayoutProps & { area: Area; style: CSSProperties }) {
  return (
    <div data-poster-area style={{ position: "absolute", overflow: "hidden", background: A.card, boxShadow: s.lite ? "none" : "0 24px 60px rgba(0,0,0,0.25)", ...style }}>
      <CrossFade id={slideKey ?? "slide"} lite={s.lite}>
        <SlideLayer s={s} slide={slide} area={area} />
      </CrossFade>
      <Counter s={s} counter={counter} />
    </div>
  );
}
/** Ticker band. Scrolls when not lite; in lite shows one item at a time, changing every 12 s. */
function Ticker({ s }: { s: DisplayState }) {
  if (!s.ticker.length) return null;
  const text = s.ticker.join("     •     ");
  const one = s.ticker[Math.floor(s.now.getTime() / 12_000) % s.ticker.length];
  const seconds = Math.max(18, Math.round(text.length * 0.22));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 72, background: A.ticker, display: "flex", alignItems: "center", gap: 24, padding: "0 72px", boxSizing: "border-box" }}>
      <div style={{ flex: "none", padding: "8px 16px", borderRadius: 999, background: A.yellow, color: A.yellowFg, fontSize: 18, fontWeight: 800, letterSpacing: "0.08em" }}>PENGUMUMAN</div>
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", fontSize: 26, fontWeight: 500 }}>
        {s.lite ? (
          <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{one}</div>
        ) : (
          <>
            <style>{"@keyframes alam-marquee{from{transform:translateX(0)}to{transform:translateX(-100%)}}"}</style>
            <span data-marquee style={{ display: "inline-block", paddingLeft: "100%", animation: `alam-marquee ${seconds}s linear infinite` }}>
              {text}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function FullLayout({ s }: LayoutProps) {
  return (
    <Page>
      <Landscape phase={s.phase} lite={s.lite} />
      <div style={{ position: "absolute", inset: 0, boxSizing: "border-box", padding: "56px 72px 112px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <Logo masjid={s.masjid} size={84} lite={s.lite} />
            <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -0.5 }}>{s.masjid.fullName}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{s.gregorian}</div>
            <div style={{ fontSize: 26, fontWeight: 500, opacity: 0.9 }}>{s.hijri}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, textShadow: s.lite ? "none" : "0 6px 40px rgba(0,0,0,0.28)" }}>
            <div style={{ fontSize: 250, fontWeight: 700, letterSpacing: -8, lineHeight: 0.9, ...num }}>{s.clock}</div>
            <div style={{ fontSize: 72, fontWeight: 600, opacity: 0.8, ...num }}>{s.seconds}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {s.current && (
              <div style={{ padding: "12px 26px", borderRadius: 999, background: "rgba(255,255,255,0.94)", color: A.currentFg, fontSize: 28, fontWeight: 800 }}>Waktu {s.current.label}</div>
            )}
            <div style={{ padding: "12px 26px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.28)", fontSize: 28, fontWeight: 600, ...glass(s.lite, A.glass, 16) }}>{countdownLine(s)}</div>
          </div>
          <FridayStrip s={s} style={{ height: 50 }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 18 }}>
          {s.waktu.map((w) => (
            <div key={w.key} data-card={w.key} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "22px 24px", minHeight: 196, ...cardLook(w, s.lite, "glass", 26) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 36 }}>
                <WaktuIcon k={w.key} size={34} />
                <StateChip w={w} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{w.label}</div>
                {s.showArabic && <Arabic style={{ fontSize: 26, opacity: 0.85 }}>{w.arabic}</Arabic>}
              </div>
              <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1, ...num }}>{w.time}</div>
            </div>
          ))}
        </div>
      </div>
      <Ticker s={s} />
    </Page>
  );
}

export function BottomLayout({ s, slide, slideKey, counter }: LayoutProps) {
  return (
    <Page>
      <Landscape phase={s.phase} lite={s.lite} />
      <SlideCard s={s} slide={slide} slideKey={slideKey} counter={counter} area="wide" style={{ top: 36, left: 36, right: 36, height: 744, borderRadius: 32 }} />

      <div
        style={{
          position: "absolute",
          left: 36,
          right: 36,
          bottom: 36,
          height: 240,
          boxSizing: "border-box",
          padding: "28px 32px",
          borderRadius: 30,
          border: "1px solid rgba(255,255,255,0.22)",
          ...glass(s.lite, "rgba(8,18,28,0.44)", 20),
          display: "grid",
          gridTemplateColumns: "340px 330px minmax(0, 1fr)",
          gap: 32,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
          <Logo masjid={s.masjid} size={76} lite={s.lite} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15 }}>{s.masjid.fullName}</div>
            <div style={{ fontSize: 19, fontWeight: 500, opacity: 0.85 }}>{s.hijri}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 32, borderLeft: "1px solid rgba(255,255,255,0.22)" }}>
          <div style={{ fontSize: 100, fontWeight: 700, letterSpacing: -3, lineHeight: 0.95, ...num }}>{s.clock}</div>
          <div style={{ fontSize: 21, fontWeight: 600, color: A.yellow, whiteSpace: "nowrap" }}>{countdownLine(s)}</div>
          <div style={{ fontSize: 18, fontWeight: 500, opacity: 0.85 }}>{s.gregorian}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 10 }}>
          {s.waktu.map((w) => (
            <div key={w.key} data-card={w.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "18px 6px", ...cardLook(w, s.lite, "subtle", 20) }}>
              <div style={{ fontSize: 21, fontWeight: 700 }}>{w.label}</div>
              {s.showArabic && <Arabic style={{ fontSize: 20, opacity: 0.85, lineHeight: 1.2 }}>{w.arabic}</Arabic>}
              <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1, whiteSpace: "nowrap", ...num }}>{w.time}</div>
            </div>
          ))}
        </div>
      </div>
      <FridayStrip s={s} style={{ position: "absolute", left: 446, top: 782, height: 44 }} />
    </Page>
  );
}

export function SideLayout({ s, slide, slideKey, counter }: LayoutProps) {
  return (
    <Page>
      <Landscape phase={s.phase} lite={s.lite} />
      <SlideCard s={s} slide={slide} slideKey={slideKey} counter={counter} area="tall" style={{ top: 36, left: 36, width: 1280, height: 1008, borderRadius: 28 }} />

      <div
        style={{
          position: "absolute",
          top: 36,
          left: 1340,
          width: 544,
          height: 1008,
          boxSizing: "border-box",
          padding: "36px 30px",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.2)",
          ...glass(s.lite, "rgba(4,14,18,0.42)", 20),
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Logo masjid={s.masjid} size={64} lite={s.lite} />
          <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.15 }}>{s.masjid.fullName}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 23, fontWeight: 700 }}>{s.gregorian}</div>
          <div style={{ fontSize: 20, fontWeight: 500, opacity: 0.85 }}>{s.hijri}</div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontSize: s.friday ? 104 : 138, fontWeight: 700, letterSpacing: -5, lineHeight: 0.92, ...num }}>{s.clock}</div>
          <div style={{ fontSize: 42, fontWeight: 600, opacity: 0.75, ...num }}>{s.seconds}</div>
        </div>
        <div style={{ display: "flex" }}>
          <div style={{ padding: "10px 20px", borderRadius: 999, background: "rgba(245,211,59,0.16)", border: "1px solid rgba(245,211,59,0.6)", color: A.yellow, fontSize: 21, fontWeight: 700 }}>
            {countdownLine(s)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: s.friday ? 6 : 8, marginTop: "auto" }}>
          {s.waktu.map((w) => (
            <div key={w.key} data-card={w.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: s.friday ? "2px 18px" : "8px 18px", ...cardLook(w, s.lite, "subtle", 18) }}>
              <WaktuIcon k={w.key} size={28} />
              <div style={{ fontSize: 24, fontWeight: 700, flex: 1 }}>{w.label}</div>
              {s.showArabic && <Arabic style={{ fontSize: 20, opacity: 0.8 }}>{w.arabic}</Arabic>}
              <div style={{ fontSize: s.friday ? 44 : 54, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1, minWidth: 130, textAlign: "right", ...num }}>{w.time}</div>
            </div>
          ))}
        </div>
        <FridayStrip s={s} variant="card" style={{ padding: "12px 20px", lineHeight: 1.25 }} />
      </div>
    </Page>
  );
}