"use client";
// The TV display (local mode): config + URL overrides, data + clock sync, DisplayState every second,
// rendered by the selected theme on the stage.
import {
  buildDisplayState,
  computeSchedule,
  formatGregorian,
  formatSeconds,
  formatTime,
  getClockOffset,
  localDateKey,
  playlistAt,
  setDebugTime,
  upcomingPrayer,
  type DisplayState,
  type ForcedModeInput,
  type LayoutKey,
  type PlaylistItem,
} from "@/core";
import {
  createFallbackLoader,
  createPrayerData,
  idbMonthStore,
  loadSlides,
  restoreClockOffset,
  startSync,
  UNAVAILABLE_MESSAGE,
  type DayResult,
  type PrayerData,
  type SyncStatus,
} from "@/data";
import { SAMPLE_POSTER, SAMPLE_POSTER_LANDSCAPE, sampleSlide, type SlideView } from "@/templates";
import { getTheme } from "@/themes/registry";
import { ThemeView, UnavailableView } from "@/themes/ThemeView";
import { useEffect, useRef, useState } from "react";
import { parseUrlOverrides, type ScreenConfig, type UrlOverrides } from "./config";
import { loadScreenConfig, type ConfigSource } from "./config-loader";
import { DebugView, MetaFooter, type DebugMeta } from "./debug-view";
import { loadDemo, tvMode } from "./demo";
import { DemoBadge } from "./demo-badge";
import { ErrorBoundary } from "./error-boundary";
import { useAutoLite, useDailyReload, useNow } from "./hooks";
import { Stage } from "./stage";
import { APP_VERSION, useOnline, useServiceWorker } from "./status";
import { PairingFlow } from "./pairing/PairingFlow";
import { supabaseConfigured } from "@/lib/supabase";

/** Bundle details for the debug overlay (paired TVs only). */
export interface BundleMeta {
  version: number | null;
  lastSync: number | null;
  status: string;
  screenName: string | null;
  from: string | null;
}

/** What the display shows: screen.json + sample slides (local mode) or the synced bundle (paired). */
export interface DisplaySource {
  config: ScreenConfig;
  configSource: ConfigSource | string;
  slides: PlaylistItem<SlideView>[];
  warnings: string[];
  bundle?: BundleMeta;
  /** Live demo (/tv?demo=1): shows the DEMO badge. */
  demo?: boolean;
}

interface Boot {
  config: ScreenConfig;
  configSource: ConfigSource | string;
  overrides: UrlOverrides;
  warnings: string[];
  data: PrayerData;
  status: SyncStatus;
  slides: PlaylistItem<SlideView>[];
  bundle?: BundleMeta;
  demo?: boolean;
}

export function TvRoot() {
  const [mode, setMode] = useState<"demo" | "local" | "paired" | null>(null);
  useEffect(() => setMode(tvMode(window.location.search, supabaseConfigured())), []);
  const screen = mode === "demo" ? <DemoApp /> : mode === "local" ? <TvApp /> : mode === "paired" ? <PairingFlow /> : <div className="h-full bg-black" />;
  return (
    <ErrorBoundary>
      <Stage>{screen}</Stage>
    </ErrorBoundary>
  );
}

/** Live demo: public/config/demo.json, bundled prayer data, no pairing, no Supabase. */
function DemoApp() {
  const [source, setSource] = useState<DisplaySource | null>(null);
  const [bootError, setBootError] = useState<unknown>(null);
  useEffect(() => {
    let cancelled = false;
    loadDemo().then((s) => !cancelled && setSource(s), (e) => !cancelled && setBootError(e));
    return () => {
      cancelled = true;
    };
  }, []);
  if (bootError) throw bootError;
  if (!source) return <div className="h-full bg-black" />;
  return <DisplayHost source={source} />;
}

/** Local mode (Phase 1): public/config/screen.json + sample-slides.json. */
function TvApp() {
  const [source, setSource] = useState<DisplaySource | null>(null);
  const [bootError, setBootError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ config, warnings, source: configSource }, slides] = await Promise.all([loadScreenConfig(), loadSlides()]);
      if (!cancelled) setSource({ config, configSource, slides: slides.items, warnings: [...warnings, ...slides.warnings] });
    })().catch((e) => !cancelled && setBootError(e));
    return () => {
      cancelled = true;
    };
  }, []);

  if (bootError) throw bootError; // caught by the ErrorBoundary: reload in 30 s
  if (!source) return <div className="h-full bg-black" />;
  return <DisplayHost source={source} />;
}

/**
 * Runs the Phase 1 data layer (clock + prayer months) for the source's zone and renders the
 * display. A zone change (Tetapan) restarts the sync, so the new zone's months are fetched.
 */
export function DisplayHost({ source }: { source: DisplaySource }) {
  const [url] = useState(() => parseUrlOverrides(window.location.search, window.location.hostname));
  const [storedClock] = useState(() => {
    const stored = restoreClockOffset();
    const o = url.overrides;
    const debugTime = o.simStartMs !== undefined || o.speed !== undefined;
    setDebugTime(debugTime ? { simStartMs: o.simStartMs, speed: o.speed } : null);
    return stored;
  });
  const [dataVersion, setDataVersion] = useState(0);
  const [sync, setSync] = useState<{ data: PrayerData; status: SyncStatus } | null>(null);
  const zone = source.config.zone;
  useDailyReload();

  useEffect(() => {
    const store = idbMonthStore();
    const s = startSync({ zone, store, initialClockSync: storedClock?.syncedAt, onMonths: () => setDataVersion((v) => v + 1) });
    setSync({ data: createPrayerData({ store, loadYear: createFallbackLoader(), liveKeys: s.status.liveKeys }), status: s.status });
    return () => s.stop();
  }, [zone, storedClock]);

  if (!sync) return <div className="h-full bg-black" />;
  const boot: Boot = {
    config: source.config,
    configSource: source.configSource,
    overrides: url.overrides,
    warnings: [...url.warnings, ...source.warnings],
    data: sync.data,
    status: sync.status,
    slides: source.slides,
    bundle: source.bundle,
    demo: source.demo,
  };
  return <Display boot={boot} dataVersion={dataVersion} />;
}

interface SlidePick {
  layout: LayoutKey;
  slide?: SlideView;
  slideKey?: string;
  counter?: { position: number; total: number };
}

/**
 * What goes in the poster area: the ?slide= preview, else the playlist slide for this moment.
 * With no eligible slide the bottom/side layouts fall back to full rather than show an empty card.
 */
function pickSlide(layout: LayoutKey, preview: UrlOverrides["slide"], slides: PlaylistItem<SlideView>[], at: number): SlidePick {
  if (layout === "full") return { layout };
  if (preview === "poster") return { layout, slide: SAMPLE_POSTER, slideKey: "preview-poster" };
  if (preview === "poster-landscape") return { layout, slide: SAMPLE_POSTER_LANDSCAPE, slideKey: "preview-poster-landscape" };
  if (preview) return { layout, slide: sampleSlide(preview), slideKey: `preview-${preview}` };
  const now = playlistAt(slides, at);
  if (!now) return { layout: "full" };
  return { layout, slide: now.item.payload, slideKey: now.item.id, counter: { position: now.position, total: now.total } };
}

/** With ?debug=1 the F key toggles a forced Friday (same as &day=fri), for quick checks. */
function useFridayKey(debug: boolean, initial: boolean): boolean {
  const [on, setOn] = useState(initial);
  useEffect(() => {
    if (!debug) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== "f") return;
      setOn((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [debug]);
  return on;
}

function Display({ boot, dataVersion }: { boot: Boot; dataVersion: number }) {
  const { config, overrides } = boot;
  const at = useNow(overrides.speed ?? 1);
  const dateKey = localDateKey(at);

  const [day, setDay] = useState<DayResult | null>(null);
  useEffect(() => {
    let cancelled = false;
    boot.data.getDay(config.zone, dateKey).then((r) => !cancelled && setDay(r));
    return () => {
      cancelled = true;
    };
  }, [boot.data, config.zone, dateKey, dataVersion]);

  const autoLite = useAutoLite(overrides.lite === undefined);
  const sw = useServiceWorker();
  const online = useOnline();
  const lite = overrides.lite ?? autoLite;
  const forced = useRef<ForcedModeInput | null>(null);
  const forceFriday = useFridayKey(overrides.debug, overrides.forceFriday);

  const { theme, warning: themeWarning } = getTheme(overrides.theme ?? config.theme);
  const configuredLayout = overrides.layout ?? config.layout;
  const pick = pickSlide(configuredLayout, overrides.slide, boot.slides, at);
  const layout = pick.layout;
  const masjid = { fullName: config.masjid.fullName, shortName: config.masjid.shortName, logoUrl: config.masjid.logo };

  const meta: DebugMeta = {
    zone: config.zone,
    theme: theme.id,
    layout,
    source: day?.status === "ok" ? day.source : day ? "tiada" : "memuat…",
    configSource: boot.configSource,
    clockOffsetMs: getClockOffset(),
    lastClockSync: boot.status.lastClockSync,
    // This session's last sync, else when the cached month was fetched (earlier session).
    lastDataSync: boot.status.lastDataSync ?? (day?.status === "ok" && day.source !== "fallback" ? (day.fetchedAt ?? null) : null),
    sim: overrides.simStartMs !== undefined || overrides.speed ? `${overrides.simStartMs !== undefined ? "dari sim" : "masa sebenar"} × ${overrides.speed ?? 1}` : null,
    liteReason: overrides.lite !== undefined ? `${lite ? "on" : "off"} (?lite=)` : `${lite ? "on" : "off"} (auto)`,
    appVersion: APP_VERSION,
    swState: sw.state,
    swVersion: sw.version,
    online,
    bundle: boot.bundle,
    warnings: [
      ...(themeWarning ? [themeWarning] : []),
      ...(layout !== configuredLayout ? [`no slides to show; ${configuredLayout} layout shown as full`] : []),
      ...boot.warnings,
      ...(forceFriday ? ["Jumaat dipaksa (day=fri / kekunci F)"] : []),
    ],
  };
  const overlay = overrides.debug && !overrides.debugState ? <DebugOverlay meta={meta} /> : null;

  if (!day) return <div className="h-full bg-black" />;
  if (day.status === "unavailable") {
    const u = { clock: formatTime(at, config.clock24h), seconds: formatSeconds(at), gregorian: formatGregorian(at), message: UNAVAILABLE_MESSAGE, masjid, lite };
    return (
      <>
        <UnavailableView theme={theme} u={u} />
        {boot.demo && <DemoBadge watch={theme.id} />}
        {overlay}
      </>
    );
  }

  // While a new day is loading just after midnight, yesterday's data still gives the right
  // current/next (everything passed, next = tomorrow's Subuh), so it is safe to keep showing.
  if (overrides.mode && !forced.current) {
    const sched = computeSchedule(
      { today: day.today, tomorrowImsak: day.tomorrowImsak ?? NaN, tomorrowSubuh: day.tomorrowSubuh ?? NaN, forceFriday: forceFriday || undefined },
      at,
    );
    forced.current = { mode: overrides.mode, target: upcomingPrayer(sched), sinceMs: at };
  }

  const s: DisplayState = buildDisplayState({
    at,
    today: day.today,
    tomorrowImsak: day.tomorrowImsak,
    tomorrowSubuh: day.tomorrowSubuh,
    forceFriday: forceFriday || undefined,
    clock24h: config.clock24h,
    showArabic: config.showArabic,
    ticker: config.ticker,
    lite,
    masjid,
    modeConfig: { durations: config.durations, iqamahMin: config.iqamahMin },
    forced: forced.current ?? undefined,
  });

  if (overrides.debugState) return <DebugView s={s} meta={meta} />;
  return (
    <>
      <ThemeView theme={theme} s={s} layout={layout} slide={pick.slide} slideKey={pick.slideKey} counter={pick.counter} />
      {boot.demo && <DemoBadge watch={`${theme.id}|${s.phase}|${s.mode}`} />}
      {overlay}
    </>
  );
}

function DebugOverlay({ meta }: { meta: DebugMeta }) {
  return (
    <div className="absolute inset-x-0 bottom-0 bg-black/80 px-8 py-4 font-jakarta text-white">
      <MetaFooter meta={meta} />
    </div>
  );
}