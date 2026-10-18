"use client";
// Alam mode screens. iqamah follows designs/A-Iqamah (ring countdown on deep green);
// azan uses the landscape, khutbah and unavailable the iqamah background.
import { formatCountdown, formatMmSs, type DisplayState } from "@/core";
import type { ReactNode } from "react";
import type { UnavailableState } from "../types";
import { Landscape } from "./landscape";
import { Arabic, Icon, Logo, Page, Star8, num } from "./parts";
import { A, glass } from "./tokens";

const ICON_SAF = "M6 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z M12 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z M18 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z M3 20v-5a3 3 0 0 1 6 0v5 M9 20v-5a3 3 0 0 1 6 0v5 M15 20v-5a3 3 0 0 1 6 0v5";
const ICON_SILENT = "M8.5 2h7A2.5 2.5 0 0 1 18 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 19.5v-15A2.5 2.5 0 0 1 8.5 2Z M3 3l18 18";

function Header({ masjid, right, lite }: { masjid: DisplayState["masjid"]; right?: ReactNode; lite: boolean }) {
  return (
    <div style={{ alignSelf: "stretch", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Logo masjid={masjid} size={68} lite={lite} />
        <div style={{ fontSize: 30, fontWeight: 700 }}>{masjid.fullName}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.85 }}>{right}</div>
    </div>
  );
}

function Pill({ icon, children }: { icon?: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 30px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", fontSize: 28, fontWeight: 600 }}>
      {icon && <Icon d={icon} size={32} color={A.yellow} />}
      {children}
    </div>
  );
}

/** Column frame used by the full-screen modes: header on top, content centred, footer at the bottom. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, boxSizing: "border-box", padding: "56px 72px", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center" }}>
      {children}
    </div>
  );
}

const Deco = () => <Star8 size={1100} color="#FFFFFF" opacity={0.05} style={{ left: 410, top: -10 }} />;

export function PreAzanBanner({ s }: { s: DisplayState }) {
  if (!s.modeTarget) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 64,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "14px 34px",
        borderRadius: 999,
        background: A.yellow,
        color: A.yellowFg,
        boxShadow: s.lite ? "none" : "0 12px 32px rgba(0,0,0,0.25)",
        fontFamily: "var(--font-plus-jakarta-sans), sans-serif",
        fontSize: 32,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {s.modeTarget.label} dalam {formatCountdown((s.modeRemainingSec ?? 0) * 1000)}
    </div>
  );
}

export function Azan({ s }: { s: DisplayState }) {
  const w = s.modeTarget;
  return (
    <Page>
      <Landscape phase={s.phase} lite={s.lite} />
      <Frame>
        <Header masjid={s.masjid} right={s.gregorian} lite={s.lite} />
        <div
          style={{
            width: 1040,
            boxSizing: "border-box",
            padding: "56px 64px",
            borderRadius: 40,
            border: A.glassBorder,
            ...glass(s.lite),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "0.32em", color: A.yellow }}>AZAN</div>
          <div style={{ fontSize: 200, fontWeight: 800, letterSpacing: -6, lineHeight: 1 }}>{w?.label}</div>
          {s.showArabic && w && <Arabic style={{ fontSize: 88, fontWeight: 600, lineHeight: 1.4 }}>{w.arabic}</Arabic>}
          <div style={{ marginTop: 10, padding: "12px 28px", borderRadius: 999, background: "rgba(255,255,255,0.94)", color: A.currentFg, fontSize: 32, fontWeight: 800, ...num }}>
            Waktu {w?.label} · {w?.time}
          </div>
        </div>
        <div style={{ height: 68 }} />
      </Frame>
    </Page>
  );
}

const R = 250;
const C = 2 * Math.PI * R;

export function Iqamah({ s }: { s: DisplayState }) {
  const w = s.modeTarget;
  const progress = s.modeProgress ?? 0;
  return (
    <Page style={{ background: A.iqamahBg }}>
      <Deco />
      <Frame>
        <Header masjid={s.masjid} right={w ? `Azan ${w.label} · ${w.time}` : null} lite={s.lite} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          {s.showArabic && <Arabic style={{ fontSize: 60, fontWeight: 600, lineHeight: 1.1 }}>إقامة</Arabic>}
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "0.32em", color: A.yellow, textTransform: "uppercase" }}>Iqamah {w?.label}</div>
          <div style={{ position: "relative", width: 560, height: 560, marginTop: 8 }}>
            <svg aria-hidden width={560} height={560} viewBox="0 0 560 560" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
              <defs>
                <linearGradient id="alam-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={A.ringFrom} />
                  <stop offset="1" stopColor={A.ringTo} />
                </linearGradient>
              </defs>
              <circle cx={280} cy={280} r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={28} />
              <circle
                data-ring
                cx={280}
                cy={280}
                r={R}
                fill="none"
                stroke="url(#alam-ring)"
                strokeWidth={28}
                strokeLinecap="round"
                strokeDasharray={`${C.toFixed(1)} ${C.toFixed(1)}`}
                strokeDashoffset={(C * progress).toFixed(1)}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <div style={{ fontSize: 168, fontWeight: 800, letterSpacing: -6, lineHeight: 1, ...num }}>{formatMmSs(s.modeRemainingSec ?? 0, true)}</div>
              <div style={{ fontSize: 30, fontWeight: 600, opacity: 0.8 }}>minit lagi</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <Pill icon={ICON_SAF}>Luruskan dan rapatkan saf</Pill>
          <Pill icon={ICON_SILENT}>Senyapkan telefon bimbit</Pill>
        </div>
      </Frame>
    </Page>
  );
}

/** Near-black, tiny clock only. */
export function Solat({ s }: { s: DisplayState }) {
  return (
    <div style={{ position: "relative", width: 1920, height: 1080, background: A.solatBg, fontFamily: "var(--font-plus-jakarta-sans), sans-serif" }}>
      <div style={{ position: "absolute", bottom: 72, left: 0, right: 0, textAlign: "center", fontSize: 52, fontWeight: 600, color: A.solatFg, ...num }}>{s.clock}</div>
    </div>
  );
}

export function Khutbah({ s }: { s: DisplayState }) {
  return (
    <Page style={{ background: A.iqamahBg }}>
      <Deco />
      <Frame>
        <Header masjid={s.masjid} right={s.gregorian} lite={s.lite} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "0.32em", color: A.yellow }}>SOLAT JUMAAT</div>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05 }}>Khutbah sedang disampaikan</div>
          <div style={{ fontSize: 170, fontWeight: 700, letterSpacing: -6, lineHeight: 1, opacity: 0.85, marginTop: 30, ...num }}>{s.clock}</div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <Pill icon={ICON_SILENT}>Senyapkan telefon bimbit</Pill>
        </div>
      </Frame>
    </Page>
  );
}

/** No trustworthy prayer data: clock and date only, never guessed times. */
export function Unavailable({ u }: { u: UnavailableState }) {
  return (
    <Page style={{ background: A.iqamahBg }}>
      <Deco />
      <Frame>
        <Header masjid={u.masjid} lite={u.lite} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <div style={{ fontSize: 250, fontWeight: 700, letterSpacing: -8, lineHeight: 0.9, ...num }}>{u.clock}</div>
            <div style={{ fontSize: 72, fontWeight: 600, opacity: 0.8, ...num }}>{u.seconds}</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, opacity: 0.85 }}>{u.gregorian}</div>
          <div style={{ marginTop: 40, fontSize: 56, fontWeight: 800 }}>{u.message}</div>
        </div>
        <div style={{ height: 68 }} />
      </Frame>
    </Page>
  );
}