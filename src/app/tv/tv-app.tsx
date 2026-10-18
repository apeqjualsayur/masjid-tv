"use client";
// The TV display: config + URL overrides, data + clock sync, DisplayState every second,
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
import { ErrorBoundary } from "./error-boundary";
import { useAutoLite, useDailyReload, useNow } from "./hooks";
import { Stage } from "./stage";
import { APP_VERSION, useOnline, useServiceWorker } from "./status";

interface Boot {
  config: ScreenConfig;
  configSource: ConfigSource;
  overrides: UrlOverrides;
  warnings: string[];
  data: PrayerData;
  status: SyncStatus;
  slides: PlaylistItem<SlideView>[];
}

export function TvRoot() {
  return (
    <ErrorBoundary>
      <Stage>
        <TvApp />
      </Stage>
    </ErrorBoundary>
  );
}

function TvApp() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [bootError, setBootError] = useState<unknown>(null);
  const [dataVersion, setDataVersion] = useState(0);
  useDailyReload();

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    (async () => {
      const { overrides, warnings: urlWarnings } = parseUrlOverrides(window.location.search, window.location.hostname);
      const [{ config, warnings: configWarnings, source: configSource }, slides] = await Promise.all([loadScreenConfig(), loadSlides()]);
      if (cancelled) return;
      const storedClock = restoreClockOffset();
      const debugTime = overrides.simStartMs !== undefined || overrides.speed !== undefined;
      setDebugTime(debugTime ? { simStartMs: overrides.simStartMs, speed: overrides.speed } : null);
      const store = idbMonthStore();
      const sync = startSync({ zone: config.zone, store, initialClockSync: storedClock?.syncedAt, onMonths: () => setDataVersion((v) => v + 1) });
      stop = sync.stop;
      const data = createPrayerData({ store, loadYear: createFallbackLoader(), liveKeys: sync.status.liveKeys });
      setBoot({ config, configSource, overrides, warnings: [...urlWarnings, ...configWarnings, ...slides.warnings], data, status: sync.status, slides: slides.items });
    })().catch((e) => !cancelled && setBootError(e));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  if (bootError) throw bootError; // caught by the ErrorBoundary: reload in 30 s
  if (!boot) return <div className="h-full bg-black" />;
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
    warnings: [
      ...(themeWarning ? [themeWarning] : []),
      ...(layout !== configuredLayout ? [`no slides to show; ${configuredLayout} layout shown as full`] : []),
      ...boot.warnings,
    ],
  };
  const overlay = overrides.debug && !overrides.debugState ? <DebugOverlay meta={meta} /> : null;

  if (!day) return <div className="h-full bg-black" />;
  if (day.status === "unavailable") {
    const u = { clock: formatTime(at, config.clock24h), seconds: formatSeconds(at), gregorian: formatGregorian(at), message: UNAVAILABLE_MESSAGE, masjid, lite };
    return (
      <>
        <UnavailableView theme={theme} u={u} />
        {overlay}
      </>
    );
  }

  // While a new day is loading just after midnight, yesterday's data still gives the right
  // current/next (everything passed, next = tomorrowImsak), so it is safe to keep showing.
  if (overrides.mode && !forced.current) {
    const sched = computeSchedule(
      { today: day.today, tomorrowImsak: day.tomorrowImsak ?? NaN, forceFriday: overrides.forceFriday || undefined },
      at,
    );
    forced.current = { mode: overrides.mode, target: upcomingPrayer(sched), sinceMs: at };
  }

  const s: DisplayState = buildDisplayState({
    at,
    today: day.today,
    tomorrowImsak: day.tomorrowImsak,
    forceFriday: overrides.forceFriday || undefined,
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