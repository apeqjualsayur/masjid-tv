"use client";
// Unpaired TV (PRD Phase 2 §4.4, designs/admin/TVPair): code + QR + countdown on the 1920×1080
// stage; once paired, the synced display (BundleDisplay). TV text stays BM.
import { useCallback, useEffect, useMemo, useState } from "react";
import { idbBundleStore, restoreClockOffset } from "@/data";
import { getTvSupabase } from "@/lib/supabase";
import { useNow } from "../hooks";
import { BundleDisplay, postMediaSync } from "./BundleDisplay";
import { browserDeviceStore } from "./device";
import { Frame, GREEN, INK, MUTED } from "./frame";
import { countdown, newSecret, pairUrl, qrModules, type PairView } from "./logic";
import { createPairingRunner } from "./runner";

function Qr({ text }: { text: string }) {
  const m = useMemo(() => qrModules(text), [text]);
  const n = m.length;
  let d = "";
  m.forEach((row, r) => row.forEach((on, c) => on && (d += `M${c} ${r}h1v1h-1z`)));
  return (
    <div role="img" aria-label="Kod QR untuk memasang skrin" style={{ width: 440, height: 440, boxSizing: "border-box", padding: 36, borderRadius: 32, background: "#FFFFFF", boxShadow: "0 30px 60px rgba(18,38,30,0.12)" }}>
      <svg width="368" height="368" viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" aria-hidden="true">
        <path d={d} fill={INK} />
      </svg>
    </div>
  );
}

function PairingView({ view, host }: { view: PairView; host: string }) {
  const t = useNow();
  const footer = (
    <div style={{ fontSize: 24, fontWeight: 500, color: MUTED }}>
      Belum berdaftar? Daftar masjid atau surau anda secara percuma di <b style={{ color: INK }}>{host}</b>
    </div>
  );
  const code = view.kind === "waiting" ? view.code : null;
  const digits = code ? [...code.slice(0, 3), "·", ...code.slice(3)] : ["", "", "", "·", "", "", ""];
  const note =
    view.kind === "offline"
      ? "Tiada sambungan internet. Mencuba semula…"
      : view.kind === "error"
        ? "Tidak dapat mendapatkan kod. Mencuba semula…"
        : view.kind === "starting"
          ? "Mendapatkan kod…"
          : `Kod tamat dalam ${countdown(view.kind === "waiting" ? view.expiresAt : 0, t)} · kod baharu dijana automatik`;
  return (
    <Frame footer={footer}>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 600px", gap: 100, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>Sambungkan skrin ini</div>
            <div style={{ fontSize: 30, fontWeight: 500, color: MUTED }}>Masukkan kod ini dalam aplikasi Masjid View pada telefon anda.</div>
          </div>
          <div aria-label={code ? `Kod ${code.split("").join(" ")}` : "Kod sedang dijana"} style={{ display: "flex", gap: 18, alignItems: "center" }}>
            {digits.map((c, i) =>
              c === "·" ? (
                <div key={i} style={{ width: 24 }} />
              ) : (
                <div key={i} style={{ width: 120, height: 150, borderRadius: 24, background: "#FFFFFF", boxShadow: "0 10px 30px rgba(18,38,30,0.10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 104, fontWeight: 800, color: INK }}>
                  {c}
                </div>
              ),
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, fontSize: 28, fontWeight: 500, color: "#3A4E45" }}>
            {[
              <>Log masuk di <b style={{ color: INK }}>{host}/admin</b></>,
              <>Pergi ke <b style={{ color: INK }}>Skrin → Tambah skrin</b></>,
              <>Masukkan kod di atas, atau imbas kod QR</>,
            ].map((line, i) => (
              <div key={i} style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 999, background: GREEN, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800 }}>{i + 1}</div>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          {code ? <Qr text={pairUrl(window.location.origin, code)} /> : <div style={{ width: 440, height: 440, borderRadius: 32, background: "#FFFFFF", opacity: 0.6 }} />}
          <div style={{ fontSize: 24, fontWeight: 600, color: MUTED }}>Imbas dengan kamera telefon</div>
          <div role="status" style={{ padding: "12px 22px", borderRadius: 999, background: "#FFFFFF", whiteSpace: "nowrap", fontSize: 22, fontWeight: 700, color: view.kind === "offline" || view.kind === "error" ? "#A3260F" : "#3A4E45" }}>
            {note}
          </div>
        </div>
      </div>
    </Frame>
  );
}

type Mode = { kind: "pairing"; view: PairView } | { kind: "paired"; secret: string };

/** The whole unpaired → paired → (revoked) → unpaired cycle. */
export function PairingFlow() {
  const [mode, setMode] = useState<Mode>({ kind: "pairing", view: { kind: "starting" } });
  const [cycle, setCycle] = useState(0);
  const host = typeof window === "undefined" ? "masjidview.my" : window.location.host;

  // Pairing: runs until the TV is paired.
  useEffect(() => {
    restoreClockOffset(); // last known clock correction, so the header clock is right
    const store = browserDeviceStore;
    const sb = getTvSupabase();
    let cancelled = false;
    const r = createPairingRunner({
      rpc: async (fn, args) => {
        const { data, error } = await sb.rpc(fn, args);
        return { data, error: error ? { message: error.message } : null };
      },
      store,
      now: () => Date.now(),
      online: () => navigator.onLine !== false,
      onView: (view) => !cancelled && setMode((m) => (m.kind === "pairing" ? { kind: "pairing", view } : m)),
      onPaired: async (secret) => {
        // A new pairing may be another masjid: never start from an older stored bundle.
        await idbBundleStore().clear();
        if (!cancelled) setMode({ kind: "paired", secret });
      },
    });
    (async () => {
      const secret = await store.loadSecret();
      if (cancelled) return;
      if (secret && store.pairedScreen()) {
        setMode({ kind: "paired", secret }); // offline boot: BundleDisplay shows the stored bundle at once
        return;
      }
      await r.start(secret);
    })();
    return () => {
      cancelled = true;
      r.stop();
    };
  }, [cycle]);

  // Revoked or deleted in the admin app: forget this pairing, new secret, new code.
  const onRevoked = useCallback(async () => {
    browserDeviceStore.markPaired(null);
    await browserDeviceStore.saveSecret(newSecret()); // the old secret can never pair again
    postMediaSync([]);
    setMode({ kind: "pairing", view: { kind: "starting" } });
    setCycle((c) => c + 1);
  }, []);

  return mode.kind === "paired" ? <BundleDisplay secret={mode.secret} onRevoked={onRevoked} /> : <PairingView view={mode.view} host={host} />;
}
