"use client";
// Falak mode screens. iqamah follows designs/G-Iqamah (dial with draining rim); the others use the
// same tokens and type scale. Sizes are the mockups ×1.5.
import { formatCountdown, formatMmSs, type DisplayState } from "@/core";
import type { ReactNode } from "react";
import { ProgressLine, khutbahEndLine } from "../shared/friday";
import type { UnavailableState } from "../types";
import { Arabic, Dial, IqamahDial, Logo, Page, Status, num, serif, tokensOf } from "./parts";
import { F, FONT, TOKENS } from "./tokens";

function Top({ s, right }: { s: { masjid: DisplayState["masjid"] }; right?: ReactNode }) {
  return (
    <div style={{ position: "absolute", top: 54, left: 96, right: 96, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Logo masjid={s.masjid} size={48} />
        <div style={{ ...serif, fontSize: 36, fontWeight: 600 }}>{s.masjid.fullName}</div>
      </div>
      {right && <div style={{ fontSize: 26, opacity: 0.8, whiteSpace: "nowrap" }}>{right}</div>}
    </div>
  );
}

const Center = ({ children, gap = 0 }: { children: ReactNode; gap?: number }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap }}>{children}</div>
);

/** Cream pill over the normal layout: "● Zohor dalam 5 minit". */
export function PreAzanBanner({ s }: { s: DisplayState }) {
  if (!s.modeTarget) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 40,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "18px 44px",
        borderRadius: 999,
        background: F.pill,
        color: F.pillInk,
        boxShadow: s.lite ? "none" : "0 18px 40px rgba(0,0,0,0.25)",
        fontFamily: FONT,
        fontSize: 34,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 14, height: 14, borderRadius: 999, background: F.gold, flex: "none" }} />
      <span>
        <span style={{ ...serif, fontWeight: 600 }}>{s.modeTarget.label}</span> dalam {formatCountdown((s.modeRemainingSec ?? 0) * 1000)}
      </span>
    </div>
  );
}

/** Azan: the dial on the left, the waktu name large on the right. */
export function Azan({ s }: { s: DisplayState }) {
  const t = tokensOf(s);
  const w = s.modeTarget;
  return (
    <Page t={t}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 96, padding: "0 120px" }}>
        <Dial s={s} size={720} labels />
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          <Status size={30}>Azan</Status>
          <div style={{ ...serif, fontSize: 168, fontWeight: 600, lineHeight: 1 }}>{w?.label}</div>
          {s.showArabic && w && <Arabic style={{ alignSelf: "flex-start", fontSize: 90, opacity: 0.8, lineHeight: 1.4 }}>{w.arabic}</Arabic>}
          <div style={{ fontSize: 36, opacity: 0.85 }}>
            Waktu {w?.label} · <span style={num}>{w?.time}</span>
          </div>
          <div style={{ fontSize: 28, opacity: 0.7, marginTop: 12 }}>{s.masjid.fullName}</div>
        </div>
      </div>
    </Page>
  );
}

/** designs/G-Iqamah: dial with the rim draining and mm:ss on the plate. */
export function Iqamah({ s }: { s: DisplayState }) {
  const t = tokensOf(s);
  const w = s.modeTarget;
  return (
    <Page t={t} style={{ boxSizing: "border-box", padding: "42px 72px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 21 }}>
        <Logo masjid={s.masjid} size={48} />
        <div style={{ ...serif, fontSize: 36, fontWeight: 600 }}>{s.masjid.fullName}</div>
        {w && (
          <div style={{ fontSize: 26, opacity: 0.75, marginLeft: 24 }}>
            Azan {w.label} · <span style={num}>{w.time}</span>
          </div>
        )}
      </div>
      <IqamahDial s={s} size={760} label={`IQAMAH ${(w?.label ?? "").toUpperCase()}`} countdown={formatMmSs(s.modeRemainingSec ?? 0, true)} />
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        {s.showArabic && (
          <>
            <Arabic style={{ fontSize: 44, opacity: 0.8 }}>سَوُّوا صُفُوفَكُمْ</Arabic>
            <div style={{ width: 2, height: 44, background: F.rule }} />
          </>
        )}
        <div style={{ ...serif, fontSize: 51, fontWeight: 500 }}>Luruskan dan rapatkan saf</div>
      </div>
    </Page>
  );
}

/** Near-black, tiny clock only: nothing to distract during solat. */
export function Solat({ s }: { s: DisplayState }) {
  return (
    <div style={{ position: "relative", width: 1920, height: 1080, background: F.solatBg, fontFamily: FONT }}>
      <div style={{ position: "absolute", bottom: 72, left: 0, right: 0, textAlign: "center", fontSize: 48, fontWeight: 300, color: F.solatFg, ...num }}>{s.clock}</div>
    </div>
  );
}

/** Rule 13: calm, the clock, expected end and a thin progress line; no ticking countdown. */
export function Khutbah({ s }: { s: DisplayState }) {
  const t = tokensOf(s);
  return (
    <Page t={t}>
      <Top s={s} right={s.gregorian} />
      <Center>
        <Status size={30}>Solat Jumaat</Status>
        <div style={{ ...serif, fontSize: 96, fontWeight: 600, marginTop: 24 }}>Khutbah sedang disampaikan</div>
        <div style={{ fontSize: 32, opacity: 0.8, marginTop: 18 }}>Senyapkan telefon bimbit</div>
        <div style={{ fontSize: 160, fontWeight: 300, lineHeight: 1, marginTop: 64, opacity: 0.85, ...num }}>{s.clock}</div>
        {s.friday && <div style={{ fontSize: 40, fontWeight: 600, color: F.gold, marginTop: 26 }}>{khutbahEndLine(s.friday)}</div>}
        <ProgressLine color={F.gold} track={F.rule} progress={s.modeProgress ?? 0} lite={s.lite} style={{ marginTop: 40 }} />
      </Center>
    </Page>
  );
}

/** No trustworthy prayer data: clock and date only, never guessed times. */
export function Unavailable({ u }: { u: UnavailableState }) {
  const t = TOKENS.zohor;
  return (
    <Page t={t}>
      <Top s={u} />
      <Center>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{ fontSize: 240, fontWeight: 300, lineHeight: 0.9, ...num }}>{u.clock}</div>
          <div style={{ fontSize: 56, opacity: 0.7, ...num }}>{u.seconds}</div>
        </div>
        <div style={{ fontSize: 32, opacity: 0.8, marginTop: 28 }}>{u.gregorian}</div>
        <div style={{ ...serif, fontSize: 56, fontWeight: 600, marginTop: 72 }}>{u.message}</div>
      </Center>
    </Page>
  );
}
