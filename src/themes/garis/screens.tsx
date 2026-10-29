"use client";
// Garis Masa mode screens. iqamah follows designs/I-Iqamah: big mm:ss and 10 blocks of 10 % each
// (owner decision 2026-10-29) draining left to right. Sizes = mockups ×1.5.
import { formatCountdown, formatMmSs, type DisplayState } from "@/core";
import type { ReactNode } from "react";
import { ProgressLine, khutbahEndLine } from "../shared/friday";
import type { UnavailableState } from "../types";
import { Arabic, Logo, Page, Status, accent, num, serif } from "./parts";
import { G, FONT } from "./tokens";

function Header({ s, right }: { s: { masjid: DisplayState["masjid"]; phase: DisplayState["phase"] }; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 21 }}>
        <Logo masjid={s.masjid} size={54} dot={accent(s)} />
        <div style={{ ...serif, fontSize: 39, fontWeight: 600 }}>{s.masjid.fullName}</div>
      </div>
      {right && <div style={{ fontSize: 27, opacity: 0.8, whiteSpace: "nowrap" }}>{right}</div>}
    </div>
  );
}

const Frame = ({ s, children }: { s: DisplayState | { phase: DisplayState["phase"] }; children: ReactNode }) => (
  <Page s={s} style={{ boxSizing: "border-box", padding: "60px 120px 54px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
    {children}
  </Page>
);

/** White pill over the normal layout: "● Zohor dalam 5 minit". */
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
        background: G.now,
        color: G.nowInk,
        boxShadow: s.lite ? "none" : "0 18px 40px rgba(0,0,0,0.3)",
        fontFamily: FONT,
        fontSize: 34,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 14, height: 14, borderRadius: 999, background: accent(s), flex: "none" }} />
      <span>
        <span style={{ fontWeight: 800 }}>{s.modeTarget.label}</span> dalam {formatCountdown((s.modeRemainingSec ?? 0) * 1000)}
      </span>
    </div>
  );
}

export function Azan({ s }: { s: DisplayState }) {
  const w = s.modeTarget;
  const a = accent(s);
  return (
    <Frame s={s}>
      <Header s={s} right={s.gregorian} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Status size={33} color={a}>
          Azan
        </Status>
        <div style={{ fontSize: 260, fontWeight: 200, lineHeight: 1, letterSpacing: "-0.03em" }}>{w?.label}</div>
        {s.showArabic && w && <Arabic style={{ fontSize: 90, opacity: 0.8, lineHeight: 1.4 }}>{w.arabic}</Arabic>}
        <div style={{ fontSize: 40, opacity: 0.85 }}>
          Waktu {w?.label} · <span style={num}>{w?.time}</span>
        </div>
      </div>
      <div style={{ height: 12, borderRadius: 999, background: a }} />
    </Frame>
  );
}

/** designs/I-Iqamah: big mm:ss; 10 blocks, each 10 % of the iqamah time, empty from the right. */
export function Iqamah({ s }: { s: DisplayState }) {
  const w = s.modeTarget;
  const a = accent(s);
  const left = 1 - Math.min(1, Math.max(0, s.modeProgress ?? 0)); // 1 → 0
  return (
    <Frame s={s}>
      <Header s={s} right={w ? `Azan ${w.label} · ${w.time}` : null} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Status size={33} color={a}>
          Iqamah {w?.label}
        </Status>
        <div style={{ fontSize: 435, fontWeight: 200, lineHeight: 1, letterSpacing: "-0.03em", ...num }}>{formatMmSs(s.modeRemainingSec ?? 0, true)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <div data-iqamah-blocks style={{ display: "flex", gap: 12 }}>
          {Array.from({ length: 10 }, (_, i) => {
            const fill = Math.min(1, Math.max(0, left * 10 - i));
            return (
              <div key={i} style={{ flex: 1, height: 66, borderRadius: 13.5, background: G.track, overflow: "hidden" }}>
                <div data-block-fill={fill.toFixed(2)} style={{ width: `${fill * 100}%`, height: "100%", background: a }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
            {s.showArabic && <Arabic style={{ fontSize: 44, opacity: 0.8 }}>سَوُّوا صُفُوفَكُمْ</Arabic>}
            <div style={{ ...serif, fontSize: 51, fontWeight: 500 }}>Luruskan dan rapatkan saf</div>
          </div>
          <div style={{ fontSize: 22.5, opacity: 0.75 }}>Senyapkan telefon bimbit</div>
        </div>
      </div>
    </Frame>
  );
}

/** Near-black, tiny clock only: nothing to distract during solat. */
export function Solat({ s }: { s: DisplayState }) {
  return (
    <div style={{ position: "relative", width: 1920, height: 1080, background: G.solatBg, fontFamily: FONT }}>
      <div style={{ position: "absolute", bottom: 72, left: 0, right: 0, textAlign: "center", fontSize: 48, fontWeight: 300, color: G.solatFg, ...num }}>{s.clock}</div>
    </div>
  );
}

/** Rule 13: calm; clock, expected end and a thin progress line; no ticking countdown. */
export function Khutbah({ s }: { s: DisplayState }) {
  const a = accent(s);
  return (
    <Frame s={s}>
      <Header s={s} right={s.gregorian} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Status size={30} color={a}>
          Solat Jumaat
        </Status>
        <div style={{ ...serif, fontSize: 96, fontWeight: 600, marginTop: 24 }}>Khutbah sedang disampaikan</div>
        <div style={{ fontSize: 32, opacity: 0.8, marginTop: 18 }}>Senyapkan telefon bimbit</div>
        <div style={{ fontSize: 160, fontWeight: 200, lineHeight: 1, marginTop: 56, opacity: 0.85, ...num }}>{s.clock}</div>
        {s.friday && <div style={{ fontSize: 40, fontWeight: 600, color: a, marginTop: 26 }}>{khutbahEndLine(s.friday)}</div>}
        <ProgressLine color={a} track={G.track} progress={s.modeProgress ?? 0} lite={s.lite} style={{ marginTop: 40 }} />
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
          <div style={{ fontSize: 240, fontWeight: 200, lineHeight: 0.9, ...num }}>{u.clock}</div>
          <div style={{ fontSize: 56, opacity: 0.7, ...num }}>{u.seconds}</div>
        </div>
        <div style={{ fontSize: 32, opacity: 0.8, marginTop: 28 }}>{u.gregorian}</div>
        <div style={{ ...serif, fontSize: 56, fontWeight: 600, marginTop: 72 }}>{u.message}</div>
      </div>
      <div />
    </Frame>
  );
}
