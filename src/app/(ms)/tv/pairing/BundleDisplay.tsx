"use client";
// Paired TV: content bundle sync (src/data/bundle.ts) → the Phase 1 display (PRD Phase 2 §7).
// Boots from the stored bundle at once; network errors never blank the screen.
import { useEffect, useMemo, useRef, useState } from "react";
import { nowMs } from "@/core";
import { bundleIntervalAt, bundleSlides, createFallbackLoader, createPrayerData, idbBundleStore, idbMonthStore, referencedMedia, startBundleSync, type BundleState } from "@/data";
import { getTvSupabase } from "@/lib/supabase";
import { bundleToScreenConfig } from "../bundle-config";
import { APP_VERSION } from "../status";
import { DisplayHost, type DisplaySource } from "../tv-app";
import { PairedView, SuspendedView } from "./frame";

/** Ask the service worker to keep exactly these media files (logo + posters), and fetch missing ones. */
export function postMediaSync(urls: string[]) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage({ type: "media-sync", urls })).catch(() => undefined);
}

export function BundleDisplay({ secret, onRevoked }: { secret: string; onRevoked: () => void }) {
  const [st, setSt] = useState<BundleState | null>(null);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  /** The masjid's zone from the latest bundle, for the night-time sync interval. */
  const zone = useRef<string | null>(null);

  useEffect(() => {
    const sb = getTvSupabase();
    // Prayer times read like the display does (IndexedDB → bundled file): works offline.
    const prayer = createPrayerData({ store: idbMonthStore(), loadYear: createFallbackLoader() });
    const sync = startBundleSync({
      call: async (since) => {
        const { data, error } = await sb.rpc("screen_bundle", { p_secret: secret, p_since: since, p_app_version: APP_VERSION });
        return { data, error: error ? { message: error.message } : null };
      },
      store: idbBundleStore(),
      onState: (s) => {
        zone.current = s.bundle?.org.zone ?? zone.current;
        setSt(s);
      },
      // 60 s by day, 120 s from Isyak + 30 min to Subuh − 30 min. nowMs() follows ?sim= on debug TVs.
      intervalMs: () => bundleIntervalAt(prayer, zone.current, nowMs()),
    });
    return () => sync.stop();
  }, [secret]);

  const revoked = st?.status === "revoked";
  useEffect(() => {
    if (revoked) onRevoked();
  }, [revoked, onRevoked]);

  const bundle = st?.bundle ?? null;
  const mapped = useMemo(() => {
    if (!bundle) return null;
    const c = bundleToScreenConfig(bundle, supabaseUrl);
    const s = bundleSlides(bundle, supabaseUrl);
    return { config: c.config, slides: s.items, warnings: [...c.warnings, ...s.warnings] };
  }, [bundle, supabaseUrl]);

  useEffect(() => {
    if (bundle) postMediaSync(referencedMedia(bundle, supabaseUrl));
  }, [bundle, supabaseUrl]);

  if (!st || revoked) return <div className="h-full bg-black" />;
  if (!bundle || !mapped) {
    const note = st.status === "offline" ? "Tiada sambungan internet. Mencuba semula…" : "Memuatkan kandungan…";
    return <PairedView name={null} masjid={null} note={note} />;
  }
  if (st.suspended) return <SuspendedView masjid={bundle.org.fullName} clock24h={mapped.config.clock24h} />;

  const source: DisplaySource = {
    config: mapped.config,
    configSource: st.from === "live" ? "bundle" : "bundle (simpanan)",
    slides: mapped.slides,
    warnings: mapped.warnings,
    bundle: { version: bundle.version, lastSync: st.lastSync, status: st.status, screenName: bundle.screen.name, from: st.from, intervalMs: st.intervalMs ?? null },
  };
  return <DisplayHost source={source} />;
}