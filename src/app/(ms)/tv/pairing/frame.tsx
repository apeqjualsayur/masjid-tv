"use client";
// Simple full-stage TV screens around pairing and sync (TV text stays BM): the shared frame,
// "Disambungkan" while the first bundle arrives, and the calm suspended screen.
import type { ReactNode } from "react";
import { formatGregorian, formatSeconds, formatTime } from "@/core";
import { useNow } from "../hooks";

export const INK = "#12261E";
export const MUTED = "#51655C";
export const GREEN = "#146C4A";

export function Logo({ size }: { size: number }) {
  return (
    <svg role="img" aria-label="Logo Masjid View" width={size} height={size} viewBox="0 0 76 76">
      <rect width="76" height="76" rx="22" fill={GREEN} />
      <path d="M24 58V36a14 14 0 0 1 28 0v22Z" fill="#FFFFFF" />
      <circle cx="38" cy="22" r="3.5" fill="#E3B04B" />
      <rect x="32" y="44" width="12" height="14" rx="6" fill={GREEN} />
    </svg>
  );
}

export function Frame({ children, footer, clock = true }: { children: ReactNode; footer?: ReactNode; clock?: boolean }) {
  const t = useNow();
  return (
    <div className="font-jakarta" style={{ position: "absolute", inset: 0, background: "#EEF5F1", color: INK, padding: "72px 110px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Logo size={64} />
          <div style={{ fontSize: 36, fontWeight: 800 }}>Masjid View</div>
        </div>
        {clock && (
          <div style={{ fontSize: 26, fontWeight: 600, color: MUTED }}>
            {formatTime(t)} · {formatGregorian(t)}
          </div>
        )}
      </div>
      {children}
      {footer}
    </div>
  );
}

/** Paired, waiting for the first content bundle. */
export function PairedView({ name, masjid, note }: { name: string | null; masjid: string | null; note?: string }) {
  return (
    <Frame>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, textAlign: "center" }}>
        <svg aria-hidden="true" width="160" height="160" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M7.5 12.5l3 3 6-6.5" />
        </svg>
        <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: -2 }}>Disambungkan</div>
        {name && <div style={{ fontSize: 44, fontWeight: 700 }}>{name}</div>}
        {masjid && <div style={{ fontSize: 30, fontWeight: 500, color: MUTED }}>{masjid}</div>}
        {note && <div style={{ marginTop: 12, padding: "12px 24px", borderRadius: 999, background: "#FFFFFF", fontSize: 24, fontWeight: 700, color: "#3A4E45" }}>{note}</div>}
      </div>
    </Frame>
  );
}

/** Masjid suspended by the platform: calm screen with the clock (PRD Phase 2 §7). */
export function SuspendedView({ masjid, clock24h }: { masjid: string | null; clock24h: boolean }) {
  const t = useNow();
  return (
    <Frame clock={false}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontSize: 220, fontWeight: 300, letterSpacing: -6, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{formatTime(t, clock24h)}</span>
          <span style={{ fontSize: 64, fontWeight: 500, color: MUTED, fontVariantNumeric: "tabular-nums" }}>{formatSeconds(t)}</span>
        </div>
        <div style={{ fontSize: 34, fontWeight: 600, color: MUTED }}>{formatGregorian(t)}</div>
        <div style={{ marginTop: 40, fontSize: 44, fontWeight: 700 }}>Paparan digantung sementara. Hubungi AJK.</div>
        {masjid && <div style={{ fontSize: 28, fontWeight: 500, color: MUTED }}>{masjid}</div>}
      </div>
    </Frame>
  );
}