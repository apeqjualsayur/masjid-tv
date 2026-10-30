"use client";
// Seterusnya mode screens. iqamah follows designs/K-Iqamah: azan + iqamah times top right, a huge
// countdown, a shrinking bar and the saf reminder. Sizes = mockups ×1.5.
import { formatCountdown, formatMmSs, type DisplayState } from "@/core";
import type { ReactNode } from "react";
import { ProgressLine, khutbahEndLine } from "../shared/friday";
import type { UnavailableState } from "../types";
import { Arabic, Caps, Logo, Page, bgOf, num } from "./parts";
import { FONT, S } from "./tokens";

function Header({ s, right }: { s: { masjid: DisplayState["masjid"] }; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 21 }}>
        <Logo masjid={s.masjid} size={54} />
        <div style={{ fontSize: 36, fontWeight: 700 }}>{s.masjid.fullName}</div>
      </div>
      {right}
    </div>
  );
}

const Frame = ({ s, children }: { s: { phase: DisplayState["phase"] }; children: ReactNode }) => (
  <Page s={s} style={{ boxSizing: "border-box", padding: "60px 96px 66px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
    {children}
  </Page>
);

const Gregorian = ({ s }: { s: DisplayState }) => <div style={{ fontSize: 27, whiteSpace: "nowrap" }}>{s.gregorian}</div>;

/** White pill over the normal layout: "● Zohor dalam 5 minit". */
export function PreAzanBanner({ s }: { s: DisplayState }) {
  if (!s.modeTarget) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 36,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "18px 44px",
        borderRadius: 999,
        background: S.next,
        color: bgOf(s),
        boxShadow: s.lite ? "none" : "0 18px 40px rgba(0,0,0,0.3)",
        fontFamily: FONT,
        fontSize: 34,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 14, height: 14, borderRadius: 999, background: bgOf(s), flex: "none" }} />
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
      <Header s={s} right={<Gregorian s={s} />} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Caps size={36} spacing="0.26em">
          Azan
        </Caps>
        <div style={{ fontSize: 270, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em", textTransform: "uppercase" }}>{w?.label}</div>
        {s.showArabic && w && <Arabic style={{ fontSize: 90, lineHeight: 1.4 }}>{w.arabic}</Arabic>}
        <div style={{ fontSize: 42, fontWeight: 500 }}>
          Waktu {w?.label} · <span style={num}>{w?.time}</span>
          {w?.iqamah && (
            <>
              {" "}
              · Iqamah <span style={num}>{w.iqamah}</span>
            </>
          )}
        </div>
      </div>
      <div />
    </Frame>
  );
}

function TimeCol({ label, value, weight }: { label: string; value: string; weight: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <Caps size={19.5}>{label}</Caps>
      <div style={{ fontSize: 57, fontWeight: weight, lineHeight: 1, ...num }}>{value}</div>
    </div>
  );
}

/** designs/K-Iqamah: countdown 495/800 and a 1140 px bar that shrinks to nothing. */
export function Iqamah({ s }: { s: DisplayState }) {
  const w = s.modeTarget;
  const left = 1 - Math.min(1, Math.max(0, s.modeProgress ?? 0));
  return (
    <Frame s={s}>
      <Header
        s={s}
        right={
          w && (
            <div style={{ display: "flex", gap: 60 }}>
              <TimeCol label="Azan" value={w.time} weight={700} />
              {w.iqamah && <TimeCol label="Iqamah" value={w.iqamah} weight={300} />}
            </div>
          )
        }
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Caps size={36} spacing="0.26em">
          Iqamah {w?.label} dalam
        </Caps>
        <div style={{ fontSize: 495, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em", ...num }}>{formatMmSs(s.modeRemainingSec ?? 0, true)}</div>
        <div style={{ marginTop: 21, width: 1140, height: 12, borderRadius: 999, background: S.track }}>
          <div data-iqamah-bar={left.toFixed(3)} style={{ width: `${left * 100}%`, height: "100%", borderRadius: 999, background: S.text }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 36 }}>
        {s.showArabic && <Arabic style={{ fontSize: 48 }}>سَوُّوا صُفُوفَكُمْ</Arabic>}
        <div style={{ fontSize: 60, fontWeight: 700, letterSpacing: "-0.01em" }}>Luruskan dan rapatkan saf</div>
      </div>
    </Frame>
  );
}

/** Near-black, tiny clock only: nothing to distract during solat. */
export function Solat({ s }: { s: DisplayState }) {
  return (
    <div style={{ position: "relative", width: 1920, height: 1080, background: S.solatBg, fontFamily: FONT }}>
      <div style={{ position: "absolute", bottom: 72, left: 0, right: 0, textAlign: "center", fontSize: 48, fontWeight: 300, color: S.solatFg, ...num }}>{s.clock}</div>
    </div>
  );
}

/** Rule 13: calm; clock, expected end and a thin progress line; no ticking countdown. */
export function Khutbah({ s }: { s: DisplayState }) {
  return (
    <Frame s={s}>
      <Header s={s} right={<Gregorian s={s} />} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Caps size={30} spacing="0.26em">
          Solat Jumaat
        </Caps>
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 24 }}>Khutbah sedang disampaikan</div>
        <div style={{ fontSize: 32, marginTop: 18 }}>Senyapkan telefon bimbit</div>
        <div style={{ fontSize: 160, fontWeight: 300, lineHeight: 1, marginTop: 56, ...num }}>{s.clock}</div>
        {s.friday && <div style={{ fontSize: 40, fontWeight: 700, marginTop: 26 }}>{khutbahEndLine(s.friday)}</div>}
        <ProgressLine color={S.text} track={S.track} progress={s.modeProgress ?? 0} lite={s.lite} style={{ marginTop: 40 }} />
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
          <div style={{ fontSize: 56, ...num }}>{u.seconds}</div>
        </div>
        <div style={{ fontSize: 32, marginTop: 28 }}>{u.gregorian}</div>
        <div style={{ fontSize: 56, fontWeight: 800, marginTop: 72 }}>{u.message}</div>
      </div>
      <div />
    </Frame>
  );
}
