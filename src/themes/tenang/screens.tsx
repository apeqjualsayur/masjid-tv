"use client";
// Tenang mode screens. iqamah follows designs/F-Iqamah; the others use the same tokens and type scale.
import { formatCountdown, formatMmSs, type DisplayState } from "@/core";
import type { ReactNode } from "react";
import type { UnavailableState } from "../types";
import { Arabic, Dot, Page, tokensOf } from "./parts";
import { SHADOW_PILL, SOLAT_BG, SOLAT_FG, TOKENS, type TenangTokens } from "./tokens";

const num = { fontVariantNumeric: "tabular-nums" } as const;

function Header({ t, left, right }: { t: TenangTokens; left: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ position: "absolute", top: 72, left: 112, right: 112, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 24, fontWeight: 500 }}>
      <div>{left}</div>
      <div style={{ color: t.muted }}>{right}</div>
    </div>
  );
}

function Center({ children }: { children: ReactNode }) {
  return <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>;
}

function Label({ t, children, size = 34 }: { t: TenangTokens; children: ReactNode; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: size, fontWeight: 600, color: t.accent }}>
      <Dot color={t.accent} size={12} />
      {children}
    </div>
  );
}

/** Floating pill over the normal layout: "Zohor dalam 5 minit". */
export function PreAzanBanner({ s }: { s: DisplayState }) {
  const t = tokensOf(s);
  if (!s.modeTarget) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 52,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "18px 44px",
        borderRadius: 999,
        background: t.card,
        color: t.fg,
        boxShadow: s.lite ? "none" : SHADOW_PILL,
        border: s.lite ? `1px solid ${t.rule}` : "none",
        fontFamily: "var(--font-manrope), sans-serif",
        fontSize: 34,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <Dot color={t.accent} size={12} />
      <span>
        <span style={{ color: t.accent }}>{s.modeTarget.label}</span> dalam {formatCountdown((s.modeRemainingSec ?? 0) * 1000)}
      </span>
    </div>
  );
}

export function Azan({ s }: { s: DisplayState }) {
  const t = tokensOf(s);
  const w = s.modeTarget;
  return (
    <Page t={t}>
      <Header t={t} left={s.masjid.fullName} right={`${s.gregorian} · ${s.clock}`} />
      <Center>
        <Label t={t}>Azan</Label>
        <div style={{ fontSize: 240, fontWeight: 300, letterSpacing: -10, lineHeight: 1, marginTop: 24 }}>{w?.label}</div>
        {s.showArabic && w && <Arabic style={{ fontSize: 96, color: t.muted, lineHeight: 1.4 }}>{w.arabic}</Arabic>}
        <div style={{ fontSize: 34, fontWeight: 500, color: t.muted, marginTop: 24 }}>Waktu {w?.label} · {w?.time}</div>
      </Center>
    </Page>
  );
}

export function Iqamah({ s }: { s: DisplayState }) {
  const t = tokensOf(s);
  const w = s.modeTarget;
  const left = 1 - (s.modeProgress ?? 0);
  return (
    <Page t={t}>
      <Header t={t} left={s.masjid.fullName} right={w ? `Azan ${w.label} · ${w.time}` : null} />
      <Center>
        <Label t={t}>Iqamah {w?.label}</Label>
        <div style={{ fontSize: 360, fontWeight: 300, letterSpacing: -16, lineHeight: 1, marginTop: 10, ...num }}>{formatMmSs(s.modeRemainingSec ?? 0, true)}</div>
        <div style={{ position: "relative", width: 1100, height: 4, borderRadius: 2, background: t.rule, marginTop: 20 }}>
          <div style={{ position: "absolute", left: 0, top: -2, height: 8, borderRadius: 4, width: `${left * 100}%`, background: t.accent }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 72 }}>
          {s.showArabic && (
            <>
              <Arabic style={{ fontSize: 44, color: t.muted }}>سَوُّوا صُفُوفَكُمْ</Arabic>
              <div style={{ width: 1, height: 44, background: t.rule }} />
            </>
          )}
          <div style={{ fontSize: 38, fontWeight: 500 }}>Luruskan dan rapatkan saf</div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 500, color: t.muted, marginTop: 18 }}>Senyapkan telefon bimbit</div>
      </Center>
    </Page>
  );
}

/** Near-black, tiny clock only: nothing to distract during solat. */
export function Solat({ s }: { s: DisplayState }) {
  return (
    <div style={{ position: "relative", width: 1920, height: 1080, background: SOLAT_BG, fontFamily: "var(--font-manrope), sans-serif" }}>
      <div style={{ position: "absolute", bottom: 72, left: 0, right: 0, textAlign: "center", fontSize: 48, fontWeight: 300, color: SOLAT_FG, ...num }}>{s.clock}</div>
    </div>
  );
}

export function Khutbah({ s }: { s: DisplayState }) {
  const t = tokensOf(s);
  return (
    <Page t={t}>
      <Header t={t} left={s.masjid.fullName} right={s.gregorian} />
      <Center>
        <Label t={t}>Solat Jumaat</Label>
        <div style={{ fontSize: 96, fontWeight: 500, letterSpacing: -3, marginTop: 28 }}>Khutbah sedang disampaikan</div>
        <div style={{ fontSize: 32, fontWeight: 500, color: t.muted, marginTop: 20 }}>Senyapkan telefon bimbit</div>
        <div style={{ fontSize: 160, fontWeight: 300, letterSpacing: -6, lineHeight: 1, marginTop: 80, color: t.muted, ...num }}>{s.clock}</div>
      </Center>
    </Page>
  );
}

/** No trustworthy prayer data: clock and date only, never guessed times. */
export function Unavailable({ u }: { u: UnavailableState }) {
  const t = TOKENS.zohor;
  return (
    <Page t={t}>
      <Header t={t} left={u.masjid.fullName} />
      <Center>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{ fontSize: 240, fontWeight: 300, letterSpacing: -10, lineHeight: 0.9, ...num }}>{u.clock}</div>
          <div style={{ fontSize: 56, fontWeight: 400, color: t.muted, ...num }}>{u.seconds}</div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 500, color: t.muted, marginTop: 28 }}>{u.gregorian}</div>
        <div style={{ fontSize: 56, fontWeight: 600, marginTop: 72 }}>{u.message}</div>
      </Center>
    </Page>
  );
}