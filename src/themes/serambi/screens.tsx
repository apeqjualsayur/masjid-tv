"use client";
// Serambi mode screens. iqamah follows designs/D-Iqamah (a single arch filling with gold light);
// azan and khutbah reuse that arch; solat is near-black with a tiny clock.
import { formatCountdown, formatMmSs, type DisplayState } from "@/core";
import type { CSSProperties, ReactNode } from "react";
import { ProgressLine, khutbahEndLine } from "../shared/friday";
import type { UnavailableState } from "../types";
import { Amiri, Caps, GoldRule, Kufi, Logo, Page, numStyle } from "./parts";
import { C, F, SKY, SOLAT_BG, SOLAT_FG, archRadius } from "./tokens";

function Header({ masjid, right }: { masjid: DisplayState["masjid"]; right?: ReactNode }) {
  return (
    <div style={{ position: "absolute", top: 52, left: 72, right: 72, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Logo masjid={masjid} size={56} />
        <div style={{ fontSize: 26, fontWeight: 600 }}>{masjid.fullName}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 500, color: C.muted }}>{right}</div>
    </div>
  );
}

/** The single large arch (780x920, gold 3px border) used by azan, iqamah and khutbah. */
function BigArch({ background, glow, children }: { background: string; glow: boolean; children: ReactNode }) {
  return (
    <div
      data-big-arch
      style={{
        position: "absolute",
        left: 570,
        top: 100,
        width: 780,
        height: 920,
        boxSizing: "border-box",
        border: `3px solid ${C.gold}`,
        borderRadius: archRadius(780, 28),
        overflow: "hidden",
        background,
        boxShadow: glow ? "0 0 120px rgba(227,176,75,0.18)" : "none",
      }}
    >
      {children}
    </div>
  );
}

const inner: CSSProperties = {
  position: "relative",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  paddingTop: 80,
  boxSizing: "border-box",
  textAlign: "center",
};

const EMERALD_ARCH = `linear-gradient(180deg, ${C.emerald2} 0%, ${C.bg} 100%)`;

export function PreAzanBanner({ s }: { s: DisplayState }) {
  if (!s.modeTarget) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 40,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "14px 36px",
        borderRadius: 999,
        background: C.sidebar,
        border: `2px solid ${C.gold}`,
        boxShadow: s.lite ? "none" : "0 0 40px rgba(227,176,75,0.25)",
        fontFamily: F.body,
        fontSize: 34,
        fontWeight: 500,
        color: C.white,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: C.gold, fontWeight: 700 }}>{s.modeTarget.label}</span> dalam {formatCountdown((s.modeRemainingSec ?? 0) * 1000)}
    </div>
  );
}

export function Azan({ s }: { s: DisplayState }) {
  const w = s.modeTarget;
  const sky = w ? SKY[w.key] : SKY.zohor;
  return (
    <Page>
      {!s.lite && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 70% at 50% 60%, ${sky.glow} 0%, rgba(11,17,20,0) 70%)`, opacity: 0.4 }} />}
      <Header masjid={s.masjid} right={s.gregorian} />
      <BigArch background={sky.sky} glow={!s.lite}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(5,10,12,.85) 0%, rgba(5,10,12,.55) 55%, rgba(5,10,12,.25) 100%)" }} />
        <div style={inner}>
          <Caps size={28} spacing={0.34}>
            Azan
          </Caps>
          <div style={{ ...numStyle, fontSize: 200, fontWeight: 600, lineHeight: 1, letterSpacing: -3 }}>{w?.label}</div>
          {s.showArabic && w && <Kufi style={{ fontSize: 96, color: "rgba(255,255,255,0.8)" }}>{w.arabic}</Kufi>}
          <GoldRule margin="26px 0 10px" />
          <div style={{ ...numStyle, fontSize: 72, fontWeight: 600 }}>{w?.time}</div>
        </div>
      </BigArch>
    </Page>
  );
}

export function Iqamah({ s }: { s: DisplayState }) {
  const w = s.modeTarget;
  const progress = s.modeProgress ?? 0;
  return (
    <Page>
      <Header masjid={s.masjid} right={w ? `Azan ${w.label} · ${w.time}` : null} />
      <BigArch background={EMERALD_ARCH} glow={!s.lite}>
        {progress > 0 && (
          <div
            data-fill
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: `${progress * 100}%`,
              background: "linear-gradient(0deg, rgba(227,176,75,0.38) 0%, rgba(227,176,75,0.06) 100%)",
              borderTop: "2px solid rgba(227,176,75,0.7)",
            }}
          />
        )}
        <div style={inner}>
          <Caps size={28} spacing={0.34}>
            Iqamah
          </Caps>
          <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
            <div style={{ ...numStyle, fontSize: 84, fontWeight: 600, lineHeight: 1 }}>{w?.label}</div>
            {s.showArabic && w && <Kufi style={{ fontSize: 56, color: "rgba(255,255,255,0.75)" }}>{w.arabic}</Kufi>}
          </div>
          <div style={{ ...numStyle, fontSize: 270, fontWeight: 600, letterSpacing: -4, lineHeight: 0.92 }}>{formatMmSs(s.modeRemainingSec ?? 0, true)}</div>
          <div style={{ fontSize: 30, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>minit lagi</div>
          <GoldRule margin="22px 0 26px" />
          {s.showArabic && <Amiri style={{ fontSize: 52, lineHeight: 1.6 }}>سَوُّوا صُفُوفَكُمْ</Amiri>}
          <div style={{ fontSize: 34, fontWeight: 600 }}>Luruskan dan rapatkan saf</div>
          <div style={{ fontSize: 24, fontWeight: 400, color: C.muted, marginTop: 6 }}>Senyapkan telefon bimbit</div>
        </div>
      </BigArch>
    </Page>
  );
}

/** Near-black, tiny clock only. */
export function Solat({ s }: { s: DisplayState }) {
  return (
    <div style={{ position: "relative", width: 1920, height: 1080, background: SOLAT_BG }}>
      <div style={{ position: "absolute", bottom: 72, left: 0, right: 0, textAlign: "center", ...numStyle, fontSize: 56, fontWeight: 500, color: SOLAT_FG }}>{s.clock}</div>
    </div>
  );
}

export function Khutbah({ s }: { s: DisplayState }) {
  return (
    <Page>
      <Header masjid={s.masjid} right={s.gregorian} />
      <BigArch background={EMERALD_ARCH} glow={!s.lite}>
        <div style={inner}>
          <Caps size={28} spacing={0.34}>
            Solat Jumaat
          </Caps>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1, marginTop: 14 }}>
            Khutbah sedang
            <br />
            disampaikan
          </div>
          <div style={{ fontSize: 28, color: C.muted, marginTop: 10 }}>Senyapkan telefon bimbit</div>
          <GoldRule margin="40px 0 20px" />
          <div style={{ ...numStyle, fontSize: 200, fontWeight: 600, lineHeight: 0.9, color: "rgba(255,255,255,0.85)" }}>{s.clock}</div>
          {s.friday && <div style={{ fontSize: 36, fontWeight: 600, color: C.gold, marginTop: 26 }}>{khutbahEndLine(s.friday)}</div>}
          <ProgressLine color={C.gold} track="rgba(227,176,75,0.2)" progress={s.modeProgress ?? 0} lite={s.lite} width={480} style={{ marginTop: 30 }} />
        </div>
      </BigArch>
    </Page>
  );
}

/** No trustworthy prayer data: clock and date only, never guessed times. */
export function Unavailable({ u }: { u: UnavailableState }) {
  return (
    <Page>
      <Header masjid={u.masjid} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <div style={{ ...numStyle, fontSize: 236, fontWeight: 600, letterSpacing: -4, lineHeight: 0.82 }}>{u.clock}</div>
          <div style={{ ...numStyle, fontSize: 76, fontWeight: 500, color: C.gold }}>{u.seconds}</div>
        </div>
        <div style={{ fontSize: 30, fontWeight: 500, color: C.muted }}>{u.gregorian}</div>
        <GoldRule margin="40px 0 20px" />
        <div style={{ fontSize: 56, fontWeight: 700 }}>{u.message}</div>
      </div>
    </Page>
  );
}