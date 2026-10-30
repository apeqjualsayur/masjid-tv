"use client";
// Kerawang mode screens. iqamah follows designs/J-Iqamah: a pierced arch that fills with gold light from
// the bottom as the iqamah time passes, the countdown beside it. Sizes = mockups ×1.5.
import { formatCountdown, formatMmSs, type DisplayState } from "@/core";
import type { ReactNode } from "react";
import { ProgressLine, khutbahEndLine } from "../shared/friday";
import type { UnavailableState } from "../types";
import { Arabic, Logo, Page, Status, num, serif } from "./parts";
import { AwanBand, Carving } from "./patterns";
import { FONT, K } from "./tokens";

function Header({ s, right }: { s: { masjid: DisplayState["masjid"] }; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 21 }}>
        <Logo masjid={s.masjid} size={60} />
        <div style={{ ...serif, fontSize: 45, fontWeight: 600 }}>{s.masjid.fullName}</div>
      </div>
      {right && <div style={{ fontSize: 27, opacity: 0.85, whiteSpace: "nowrap" }}>{right}</div>}
    </div>
  );
}

/** The page between the two awan bands. */
const Frame = ({ s, children }: { s: { phase: DisplayState["phase"]; lite?: boolean }; children: ReactNode }) => (
  <Page s={s}>
    <AwanBand edge="top" />
    <AwanBand edge="bottom" />
    <div style={{ position: "absolute", left: 0, right: 0, top: 39, bottom: 39, boxSizing: "border-box", padding: "48px 90px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>{children}</div>
  </Page>
);

/** Gold plaque over the normal layout: "● Zohor dalam 5 minit". */
export function PreAzanBanner({ s }: { s: DisplayState }) {
  if (!s.modeTarget) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "18px 44px",
        borderRadius: 999,
        border: `4.5px solid ${K.timber}`,
        background: K.gold,
        color: K.timber,
        boxShadow: s.lite ? "none" : "0 18px 40px rgba(0,0,0,0.35)",
        fontFamily: FONT,
        fontSize: 34,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 14, height: 14, borderRadius: 999, background: K.timber, flex: "none" }} />
      <span>
        <span style={{ fontWeight: 800 }}>{s.modeTarget.label}</span> dalam {formatCountdown((s.modeRemainingSec ?? 0) * 1000)}
      </span>
    </div>
  );
}

export function Azan({ s }: { s: DisplayState }) {
  const w = s.modeTarget;
  return (
    <Frame s={s}>
      <Header s={s} right={s.gregorian} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Status size={33}>Azan</Status>
        <div style={{ ...serif, fontSize: 230, fontWeight: 600, lineHeight: 1.05 }}>{w?.label}</div>
        {s.showArabic && w && <Arabic style={{ fontSize: 90, opacity: 0.85, lineHeight: 1.4 }}>{w.arabic}</Arabic>}
        <div style={{ fontSize: 40, opacity: 0.9 }}>
          Waktu {w?.label} · <span style={num}>{w?.time}</span>
        </div>
      </div>
      <div style={{ height: 12, borderRadius: 999, background: K.gold }} />
    </Frame>
  );
}

const ARCH = { w: 660, h: 912, border: 9 } as const;

/** designs/J-Iqamah: the arch fills with gold-lit carving from the bottom; full when iqamah is due. */
export function Iqamah({ s }: { s: DisplayState }) {
  const w = s.modeTarget;
  const progress = Math.min(1, Math.max(0, s.modeProgress ?? 0));
  const inner = ARCH.h - 2 * ARCH.border;
  return (
    <Page s={s}>
      <AwanBand edge="top" />
      <AwanBand edge="bottom" />
      <div
        data-iqamah-arch
        style={{
          position: "absolute",
          left: 135,
          top: 84,
          width: ARCH.w,
          height: ARCH.h,
          boxSizing: "border-box",
          border: `${ARCH.border}px solid ${K.gold}`,
          borderRadius: `${ARCH.w / 2}px ${ARCH.w / 2}px 24px 24px`,
          overflow: "hidden",
          background: K.timber,
          boxShadow: s.lite ? "none" : "0 0 90px 6px rgba(242,196,90,0.35)",
        }}
      >
        <Carving lit={false} style={{ position: "absolute", inset: 0 }} />
        <div data-iqamah-light={progress.toFixed(3)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${progress * 100}%`, overflow: "hidden", borderTop: progress > 0 ? `4.5px solid ${K.lightEdge}` : "none" }}>
          {/* full arch height anchored at the bottom, so the lit tiles line up with the unlit ones */}
          <Carving lit style={{ position: "absolute", left: 0, bottom: 0, height: inner }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 900, right: 105, top: 84, height: ARCH.h, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 21, marginBottom: 27 }}>
          <Logo masjid={s.masjid} size={54} />
          <div style={{ ...serif, fontSize: 39, fontWeight: 600 }}>{s.masjid.fullName}</div>
        </div>
        <Status size={33}>Iqamah {w?.label}</Status>
        {w && (
          <div style={{ fontSize: 30, fontWeight: 500, opacity: 0.85, ...num }}>
            Azan {w.label} · {w.time}
          </div>
        )}
        <div style={{ fontSize: 315, fontWeight: 200, lineHeight: 1, letterSpacing: "-0.03em", ...num }}>{formatMmSs(s.modeRemainingSec ?? 0, true)}</div>
        {s.showArabic && <Arabic style={{ fontSize: 48, opacity: 0.9, marginTop: 12, alignSelf: "flex-start" }}>سَوُّوا صُفُوفَكُمْ</Arabic>}
        <div style={{ ...serif, fontSize: 57, fontWeight: 500, marginTop: 12 }}>Luruskan dan rapatkan saf</div>
        <div style={{ fontSize: 27, opacity: 0.85 }}>Senyapkan telefon bimbit</div>
      </div>
    </Page>
  );
}

/** Near-black, tiny clock only: nothing to distract during solat. */
export function Solat({ s }: { s: DisplayState }) {
  return (
    <div style={{ position: "relative", width: 1920, height: 1080, background: K.solatBg, fontFamily: FONT }}>
      <div style={{ position: "absolute", bottom: 72, left: 0, right: 0, textAlign: "center", fontSize: 48, fontWeight: 300, color: K.solatFg, ...num }}>{s.clock}</div>
    </div>
  );
}

/** Rule 13: calm; clock, expected end and a thin progress line; no ticking countdown. */
export function Khutbah({ s }: { s: DisplayState }) {
  return (
    <Frame s={s}>
      <Header s={s} right={s.gregorian} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Status size={30}>Solat Jumaat</Status>
        <div style={{ ...serif, fontSize: 96, fontWeight: 600, marginTop: 24 }}>Khutbah sedang disampaikan</div>
        <div style={{ fontSize: 32, opacity: 0.85, marginTop: 18 }}>Senyapkan telefon bimbit</div>
        <div style={{ fontSize: 160, fontWeight: 300, lineHeight: 1, marginTop: 56, opacity: 0.9, ...num }}>{s.clock}</div>
        {s.friday && <div style={{ fontSize: 40, fontWeight: 600, color: K.gold, marginTop: 26 }}>{khutbahEndLine(s.friday)}</div>}
        <ProgressLine color={K.gold} track={K.track} progress={s.modeProgress ?? 0} lite={s.lite} style={{ marginTop: 40 }} />
      </div>
      <div />
    </Frame>
  );
}

/** No trustworthy prayer data: clock and date only, never guessed times. */
export function Unavailable({ u }: { u: UnavailableState }) {
  const s = { masjid: u.masjid, phase: "zohor" as const };
  return (
    <Frame s={s}>
      <Header s={s} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{ fontSize: 240, fontWeight: 300, lineHeight: 0.9, ...num }}>{u.clock}</div>
          <div style={{ fontSize: 56, opacity: 0.85, ...num }}>{u.seconds}</div>
        </div>
        <div style={{ fontSize: 32, opacity: 0.85, marginTop: 28 }}>{u.gregorian}</div>
        <div style={{ ...serif, fontSize: 56, fontWeight: 600, marginTop: 72 }}>{u.message}</div>
      </div>
      <div />
    </Frame>
  );
}
