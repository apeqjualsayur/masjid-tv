"use client";
// JAKIM zone picker (PRD Phase 2 §4.2, designs/admin/Register "Contoh zon"): GPS first, then
// Negeri → Daerah lists, multi-zone choice, confirmation card with today's times, and "Tukar zon".
// Used by Daftar and (later) Tetapan. Errors never block: the lists are always there.
import { useMemo, useState } from "react";
import { formatTime } from "@/core";
import { usePrayerToday } from "../home/usePrayerToday";
import { useT } from "../i18n";
import { Dialog } from "../shell/Dialog";
import { browserGpsDeps, locateZone, type GpsFailure } from "./gps";
import { areasOfState, choiceFromArea, choiceFromZone, searchZones, states, zoneAreaText, zoneAreas, type ZoneChoice } from "./logic";

const label = "text-[13px] font-bold text-[#3A4E45]";
const select = "h-12 w-full min-w-0 rounded-xl border border-adm-line bg-white px-2.5 text-[15px] text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-green disabled:opacity-50";

export interface ZonePickerProps {
  value: ZoneChoice | null;
  onChange: (choice: ZoneChoice | null) => void;
  /** Error key to show under the card (e.g. register.err.zoneRequired). */
  error?: string;
  id?: string;
  /** Read-only (editors in Tetapan). */
  disabled?: boolean;
}

export function ZonePicker({ value, onChange, error, id = "zone", disabled = false }: ZonePickerProps) {
  const { t } = useT();
  const allStates = useMemo(() => states(), []);
  const [state, setState] = useState(value?.state ?? "");
  const [areaName, setAreaName] = useState(value && value.source !== "gps" ? value.district : "");
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<GpsFailure | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);

  const areas = useMemo(() => (state ? areasOfState(state) : []), [state]);
  const area = areas.find((a) => a.name === areaName) ?? null;
  const multi = area && area.zones.length > 1 ? area : null;

  const useLocation = async () => {
    setLocating(true);
    setGpsError(null);
    const r = await locateZone(browserGpsDeps());
    setLocating(false);
    if (!r.ok) {
      setGpsError(r.reason);
      return;
    }
    setState(r.choice.state);
    const match = areasOfState(r.choice.state).find((a) => a.zones.includes(r.choice.zone) && a.name.toLowerCase() === r.choice.district.toLowerCase());
    setAreaName(match?.name ?? "");
    onChange(r.choice);
  };

  const pickState = (s: string) => {
    setState(s);
    setAreaName("");
    onChange(null);
  };
  const pickArea = (name: string) => {
    setAreaName(name);
    const a = areas.find((x) => x.name === name);
    onChange(a ? choiceFromArea(state, a) : null);
  };
  const pickZone = (code: string) => {
    const c = choiceFromZone(code);
    if (!c) return;
    setState(c.state);
    const single = areasOfState(c.state).filter((a) => a.zones.length === 1 && a.zones[0] === c.zone);
    setAreaName(single.length === 1 ? single[0].name : "");
    onChange(single.length === 1 ? { ...c, district: single[0].name } : c);
    setChangeOpen(false);
  };

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3 rounded-[18px] bg-adm-card p-4 shadow-[0_1px_3px_rgba(18,38,30,0.08)]">
      <div className="flex flex-col gap-0.5">
        <h2 id={`${id}-title`} className="text-[15px] font-extrabold">{t("zone.title")}</h2>
        <p className="text-[12px] leading-[1.45] text-adm-muted">{t("zone.subtitle")}</p>
      </div>

      <button
        type="button"
        onClick={useLocation}
        disabled={locating || disabled}
        className="flex h-[50px] items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-adm-green bg-white text-[15px] font-bold text-adm-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-70"
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={locating ? "animate-spin" : undefined}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3 M12 19v3 M2 12h3 M19 12h3" />
          <circle cx="12" cy="12" r="8" />
        </svg>
        {locating ? t("zone.locating") : t("zone.useLocation")}
      </button>
      <p className="-mt-1 text-center text-[12px] text-adm-muted">{t("zone.hint")}</p>

      {gpsError && (
        <p role="alert" className="rounded-xl bg-[#FFF4DF] px-3 py-2.5 text-[13px] leading-[1.45] text-[#6B4A12]">
          {t(`zone.err.${gpsError}`)} {t("zone.err.fallback")}
        </p>
      )}

      <div className="flex items-center gap-3 text-[12px] font-bold text-[#6A7D74]">
        <div className="h-px flex-1 bg-[#DCE6E1]" />
        {t("zone.or")}
        <div className="h-px flex-1 bg-[#DCE6E1]" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`${id}-state`} className={label}>{t("zone.state")}</label>
          <select id={`${id}-state`} value={state} disabled={disabled} onChange={(e) => pickState(e.target.value)} className={select}>
            <option value="">{t("zone.choose")}</option>
            {allStates.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`${id}-district`} className={label}>{t("zone.district")}</label>
          <select id={`${id}-district`} value={areaName} disabled={!state || disabled} onChange={(e) => pickArea(e.target.value)} className={select}>
            <option value="">{t("zone.choose")}</option>
            {areas.map((a) => (
              <option key={a.name} value={a.name}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {multi && (
        <div role="radiogroup" aria-label={t("zone.multi")} className="flex flex-col gap-2">
          <p className="rounded-xl bg-[#FFF4DF] px-3 py-2.5 text-[13px] leading-[1.45] text-[#6B4A12]">{t("zone.multi")}</p>
          {multi.zones.map((code) => {
            const sel = value?.zone === code;
            return (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={sel}
                disabled={disabled}
                onClick={() => onChange(choiceFromArea(state, multi, code))}
                className={`flex items-start gap-3 rounded-[14px] border-[1.5px] px-3.5 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green ${sel ? "border-adm-green bg-[#F1F8F4]" : "border-adm-line bg-white"}`}
              >
                <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${sel ? "border-adm-green" : "border-[#9FB3A9]"}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${sel ? "bg-adm-green" : "bg-transparent"}`} />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-extrabold">{code}</span>
                  <span className="text-[12px] leading-[1.4] text-adm-muted">{zoneAreaText(code)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {value && <ConfirmCard value={value} onChange={disabled ? undefined : () => setChangeOpen(true)} />}
      {!value && !disabled && (
        <button type="button" onClick={() => setChangeOpen(true)} className="min-h-11 self-start text-[13px] font-extrabold text-adm-green underline-offset-2 hover:underline">
          {t("zone.change")}
        </button>
      )}
      {error && <p className="text-[13px] font-semibold text-adm-danger">{t(error)}</p>}

      <ZoneSearch open={changeOpen} onClose={() => setChangeOpen(false)} onPick={pickZone} current={value?.zone ?? null} />
    </section>
  );
}

function ConfirmCard({ value, onChange }: { value: ZoneChoice; onChange?: () => void }) {
  const { t } = useT();
  const [now] = useState(() => Date.now());
  const { schedule, loading } = usePrayerToday(value.zone, now);
  const six = schedule?.waktu.filter((w) => w.key !== "imsak" && Number.isFinite(w.time)) ?? [];
  return (
    <div aria-live="polite" className="flex flex-col gap-2.5 rounded-[14px] bg-adm-soft p-3.5 text-adm-green-dark">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[15px] font-extrabold">{t("zone.code", { zone: value.zone })}</span>
        <span className="text-[12px] font-bold">{t(`zone.source.${value.source}`)}</span>
      </div>
      <p className="text-[12px] leading-[1.45]">{zoneAreaText(value.zone)}</p>
      <p className="mt-0.5 text-[12px] font-bold">{t("zone.today")}</p>
      {loading ? (
        <p className="text-[13px]">{t("zone.loadingTimes")}</p>
      ) : six.length === 6 ? (
        <ol className="grid grid-cols-3 gap-1.5">
          {six.map((w) => (
            <li key={w.key} className="flex flex-col gap-px rounded-[10px] bg-white px-2 py-1.5">
              <span className="text-[11px] font-semibold text-adm-muted">{w.label}</span>
              <span className="text-[16px] font-extrabold text-adm-ink">{formatTime(w.time)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[13px]">{t("zone.noTimes")}</p>
      )}
      <div className="mt-0.5 flex items-center justify-between gap-2.5">
        <span className="text-[13px] font-bold">{t("zone.confirm")}</span>
        {onChange && (
        <button type="button" onClick={onChange} className="min-h-11 whitespace-nowrap text-[13px] font-extrabold text-adm-green underline-offset-2 hover:underline">
          {t("zone.change")}
        </button>
        )}
      </div>
    </div>
  );
}

function ZoneSearch({ open, onClose, onPick, current }: { open: boolean; onClose: () => void; onPick: (code: string) => void; current: string | null }) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const results = useMemo(() => searchZones(q), [q]);
  return (
    <Dialog open={open} onClose={onClose} title={t("zone.changeTitle")}>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("zone.search")}
        aria-label={t("zone.search")}
        className="mb-3 h-12 w-full rounded-xl border border-adm-line bg-white px-4 text-[16px] focus-visible:outline-2 focus-visible:outline-adm-green"
      />
      {results.length === 0 ? (
        <p className="py-4 text-center text-[14px] text-adm-muted">{t("zone.noResults")}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {results.map((z) => (
            <li key={z.jakimCode}>
              <button
                type="button"
                onClick={() => onPick(z.jakimCode)}
                aria-current={current === z.jakimCode ? "true" : undefined}
                className={`flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left hover:bg-adm-ground focus-visible:outline-2 focus-visible:outline-adm-green ${current === z.jakimCode ? "bg-adm-soft" : ""}`}
              >
                <span className="text-[14px] font-extrabold">
                  {z.jakimCode} <span className="font-semibold text-adm-muted">· {z.negeri}</span>
                </span>
                <span className="text-[12px] leading-[1.4] text-adm-muted">{zoneAreas(z.daerah).join(", ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}