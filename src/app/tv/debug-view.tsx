// Temporary plain view (no theme): prints the DisplayState as large text to verify the logic.
// Replaced by the theme renderer in Prompt 5.
import { formatCountdown, formatMmSs, formatSeconds, formatTime, type DisplayState, type WaktuView } from "@/core";

export interface DebugMeta {
  zone: string;
  theme: string;
  layout: string;
  source: string;
  configSource: string;
  clockOffsetMs: number;
  lastClockSync: number | null;
  lastDataSync: number | null;
  sim: string | null;
  liteReason: string;
  appVersion: string;
  swState: string;
  swVersion: string | null;
  online: boolean;
  warnings: string[];
}

const STATE_STYLE: Record<WaktuView["state"], string> = {
  current: "bg-white text-slate-900 font-extrabold",
  next: "bg-white/10 ring-4 ring-yellow-300 font-bold",
  past: "bg-white/10 opacity-45",
  upcoming: "bg-white/10",
};

const at = (ms: number | null) => (ms === null ? "belum" : `${formatTime(ms, true)}:${formatSeconds(ms)}`);

export function DebugView({ s, meta }: { s: DisplayState; meta: DebugMeta }) {
  const modeLine =
    s.mode === "normal"
      ? "normal"
      : `${s.mode} · ${s.modeTarget?.label ?? "?"} · baki ${formatMmSs(s.modeRemainingSec ?? 0)} · ${Math.round((s.modeProgress ?? 0) * 100)}%`;
  const banner =
    s.mode === "pre_azan" && s.modeTarget
      ? `${s.modeTarget.label} dalam ${formatCountdown((s.modeRemainingSec ?? 0) * 1000)}`
      : null;

  return (
    <div className="flex h-full flex-col gap-6 bg-slate-950 p-12 font-jakarta text-white">
      <header className="flex items-start justify-between">
        <div className="flex items-baseline gap-4">
          <span className="text-[200px] leading-none font-bold tabular-nums">{s.clock}</span>
          <span className="text-[64px] font-semibold tabular-nums text-white/60">{s.seconds}</span>
        </div>
        <div className="text-right text-[34px] leading-snug">
          <div className="text-[40px] font-bold">{s.masjid.fullName} ({s.masjid.shortName})</div>
          <div>{s.gregorian}</div>
          <div>{s.hijri}</div>
          <div className="text-white/60">
            phase <b className="text-white">{s.phase}</b> · {s.isFriday ? "Jumaat" : "bukan Jumaat"} · lite {String(s.lite)} · arabic{" "}
            {String(s.showArabic)}
          </div>
        </div>
      </header>

      <div className="text-[48px] font-bold">
        MODE: <span className="text-yellow-300">{modeLine}</span>
        {banner && <span className="ml-6 text-[36px] text-white/80">banner “{banner}”</span>}
      </div>

      <div className="grid grid-cols-7 gap-4">
        {s.waktu.map((w) => (
          <div key={w.key} className={`rounded-3xl p-5 text-center ${STATE_STYLE[w.state]}`}>
            <div className="text-[32px]">
              {w.label}
              {w.isMarker && <span className="text-[20px]"> (penanda)</span>}
            </div>
            {s.showArabic && (
              <div lang="ar" dir="rtl" className="font-naskh text-[28px]">
                {w.arabic}
              </div>
            )}
            <div className="text-[56px] font-bold tabular-nums">{w.time}</div>
            <div className="text-[22px] uppercase tracking-wide">
              {w.state === "current" ? "SEKARANG" : w.state === "next" ? "SETERUSNYA" : w.state}
            </div>
          </div>
        ))}
      </div>

      <div className="text-[40px]">
        Sekarang: <b>{s.current?.label ?? "—"}</b> · Seterusnya: <b>{s.next.label}</b>
        {s.countdownText && <> dalam <b>{s.countdownText}</b></>}
      </div>

      <div className="truncate rounded-2xl bg-white/5 px-6 py-3 text-[28px]">Ticker: {s.ticker.join("  •  ") || "(kosong)"}</div>

      <MetaFooter meta={meta} />
    </div>
  );
}

/** "16:43:33 (2 min lalu)" */
function ago(ms: number | null): string {
  if (ms === null) return "belum";
  const min = Math.floor((Date.now() - ms) / 60_000);
  const rel = min < 1 ? "baru" : min < 60 ? `${min} min lalu` : min < 1440 ? `${Math.floor(min / 60)} jam lalu` : `${Math.floor(min / 1440)} hari lalu`;
  return `${at(ms)} (${rel})`;
}

/** Status rows (PRD section 9.3, prompt 9). Each value carries a data-status-* attribute for the e2e checks. */
export function MetaFooter({ meta }: { meta: DebugMeta }) {
  const staleClock = meta.lastClockSync === null || Date.now() - meta.lastClockSync > 24 * 3600_000;
  const row = (label: string, key: string, value: string, extra?: React.ReactNode) => (
    <div className="flex gap-3">
      <span className="text-white/45">{label}</span>
      <span {...{ [`data-status-${key}`]: value }} className="text-white/90">
        {value}
      </span>
      {extra}
    </div>
  );
  return (
    <footer data-status className="mt-auto grid grid-cols-3 gap-x-10 gap-y-1 text-[20px]">
      {row("Sumber data", "source", meta.source)}
      {row("Data sync", "data-sync", ago(meta.lastDataSync))}
      {row(
        "Jam sync",
        "clock-sync",
        ago(meta.lastClockSync),
        staleClock && <span className="ml-1 mt-2 inline-block h-3 w-3 rounded-full bg-orange-400" title="Jam belum disegerak > 24 jam" />,
      )}
      {row("Offset jam", "offset", `${meta.clockOffsetMs >= 0 ? "+" : ""}${(meta.clockOffsetMs / 1000).toFixed(1)} s`)}
      {row("Lite", "lite", meta.liteReason)}
      {row("Versi", "version", meta.appVersion)}
      {row("Service worker", "sw", meta.swVersion ? `${meta.swState} · ${meta.swVersion}` : meta.swState)}
      {row("Rangkaian", "online", meta.online ? "online" : "offline")}
      {row("Konfigurasi", "config", meta.configSource)}
      {row("Zon / tema", "theme", `${meta.zone} · ${meta.theme} · ${meta.layout}`)}
      {row("Sim", "sim", meta.sim ?? "tiada")}
      {meta.warnings.length > 0 && <div className="col-span-3 text-orange-300">⚠ {meta.warnings.join(" · ")}</div>}
    </footer>
  );
}