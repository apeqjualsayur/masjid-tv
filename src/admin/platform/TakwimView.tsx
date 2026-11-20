"use client";
// Platform → Takwim (PRD enhancements §5.5, platform owner only): JAKIM's dates for the 9 events per
// Hijri year. Each row saves on its own (insert or update by event + year); "Sahkan" turns jangkaan
// into rasmi. Any change reaches every active masjid's TVs on their next sync (DB trigger).
import { useMemo, useState } from "react";
import { ISLAMIC_EVENT_INFO, localDateKey } from "@/core";
import { getSupabase } from "@/lib/supabase";
import { useT } from "../i18n";
import { Dialog } from "../shell/Dialog";
import { useIsDesktop } from "../shell/useIsDesktop";
import {
  NOTE_MAX, YEAR_MAX, YEAR_MIN, currentHijriYear, datedNextYear, draftChanged, hijriDayOf, nextEvents, suggestYear, takwimPayload, takwimYears, validateTakwim, yearGrid,
  type TakwimDraft, type TakwimErrors, type TakwimRow,
} from "./takwim";
import { useTakwim } from "./useTakwim";

const card = "rounded-[16px] bg-white shadow-[0_1px_3px_rgba(18,38,30,0.08)]";
const input = "h-11 w-full min-w-0 rounded-xl border bg-white px-3 text-[15px] text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-green";

export function TakwimView() {
  const { t, locale } = useT();
  const desktop = useIsDesktop();
  const { rows, error, reload } = useTakwim();
  const today = localDateKey(Date.now());
  const years = useMemo(() => takwimYears(rows ?? []), [rows]);
  const [extraYears, setExtraYears] = useState<number[]>([]);
  const allYears = useMemo(() => [...new Set([...years, ...extraYears])].sort((a, b) => b - a), [years, extraYears]);
  const [year, setYear] = useState<number | null>(null);
  const shown = year ?? allYears.find((y) => (rows ?? []).some((r) => r.hijri_year === y && r.greg_date >= today)) ?? allYears[0] ?? null;
  const [newYear, setNewYear] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TakwimDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const upcoming = useMemo(() => nextEvents(rows ?? [], today), [rows, today]);
  const highlighted = new Set(upcoming.map((r) => r.id));
  const dated = datedNextYear(rows ?? [], today);
  const fmt = (d: string) => new Date(`${d}T12:00:00+08:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });

  const addYear = () => {
    const y = Number(newYear || suggestYear(allYears, currentHijriYear(new Date())));
    if (!Number.isInteger(y) || y < YEAR_MIN || y > YEAR_MAX) return setNotice({ ok: false, text: t("platform.takwim.err.year", { min: YEAR_MIN, max: YEAR_MAX }) });
    setExtraYears((x) => (x.includes(y) ? x : [...x, y]));
    setYear(y);
    setNewYear("");
    setNotice(null);
  };

  const remove = async (d: TakwimDraft) => {
    if (!d.id) return;
    setBusy(true);
    const { error: e } = await getSupabase().from("islamic_events").delete().eq("id", d.id);
    setBusy(false);
    setConfirmDelete(null);
    if (e) return setNotice({ ok: false, text: t("platform.takwim.err.save", { message: e.message }) });
    setNotice({ ok: true, text: t("platform.takwim.deleted", { event: ISLAMIC_EVENT_INFO[d.event_key].label, year: d.hijri_year }) });
    reload();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[820px] text-[14px] leading-[1.5] text-adm-muted">{t("platform.takwim.intro")}</p>
      {error && <p role="alert" className="rounded-xl bg-[#FDECE8] px-3.5 py-3 text-[14px] text-adm-danger">{t("platform.takwim.err.load", { message: error })}</p>}
      {notice && (
        <p role={notice.ok ? "status" : "alert"} className={`rounded-xl px-3.5 py-3 text-[14px] ${notice.ok ? "bg-adm-soft text-adm-green-dark" : "bg-[#FDECE8] text-adm-danger"}`}>{notice.text}</p>
      )}
      {rows && dated < 9 && (
        <p role="status" className="rounded-xl bg-[#FFF4DF] px-3.5 py-3 text-[14px] leading-[1.5] text-[#6B4A12]">{t("platform.takwim.warnIncomplete", { n: dated })}</p>
      )}

      {upcoming.length > 0 && (
        <section aria-labelledby="tk-next" className={`${card} flex flex-col gap-2 p-4`}>
          <h2 id="tk-next" className="text-[13px] font-extrabold tracking-[0.06em] text-adm-muted uppercase">{t("platform.takwim.next")}</h2>
          <ul className="flex flex-col gap-1.5 lg:flex-row lg:gap-6">
            {upcoming.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 text-[15px]">
                <span className="font-bold">{ISLAMIC_EVENT_INFO[r.event_key].label}</span>
                <span className="text-adm-muted">{fmt(r.greg_date)}</span>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label={t("platform.takwim.years")} className="flex flex-wrap gap-1.5">
          {allYears.map((y) => (
            <button key={y} type="button" role="tab" aria-selected={y === shown} onClick={() => setYear(y)} className={`h-11 rounded-xl px-4 text-[15px] font-bold focus-visible:outline-2 focus-visible:outline-adm-green ${y === shown ? "bg-adm-ink text-white" : "bg-white text-adm-ink shadow-[0_1px_3px_rgba(18,38,30,0.08)]"}`}>
              {y}H
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          <label htmlFor="tk-year" className="sr-only">{t("platform.takwim.addYearLabel")}</label>
          <input id="tk-year" inputMode="numeric" value={newYear} onChange={(e) => setNewYear(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder={String(suggestYear(allYears, currentHijriYear(new Date())))} className={`${input} w-[110px] border-adm-line`} />
          <button type="button" onClick={addYear} className="h-11 rounded-xl border-[1.5px] border-adm-green bg-white px-4 text-[14px] font-bold text-adm-green">
            {t("platform.takwim.addYear")}
          </button>
        </div>
      </div>

      {!rows && !error ? (
        <p className={`${card} p-5 text-[14px] text-adm-muted`}>{t("app.loading")}</p>
      ) : shown === null ? (
        <p className={`${card} p-5 text-[14px] text-adm-muted`}>{t("platform.takwim.empty")}</p>
      ) : (
        <YearTable
          key={shown}
          year={shown}
          rows={rows ?? []}
          desktop={desktop}
          highlighted={highlighted}
          onSaved={(text) => {
            setNotice({ ok: true, text });
            reload();
          }}
          onError={(text) => setNotice({ ok: false, text })}
          onDelete={setConfirmDelete}
        />
      )}

      <Dialog open={Boolean(confirmDelete)} onClose={() => !busy && setConfirmDelete(null)} title={t("platform.takwim.deleteTitle")}>
        {confirmDelete && (
          <>
            <p className="mb-5 text-[15px] leading-[1.5]">{t("platform.takwim.deleteBody", { event: ISLAMIC_EVENT_INFO[confirmDelete.event_key].label, year: confirmDelete.hijri_year })}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => setConfirmDelete(null)} className="h-[46px] rounded-xl border-[1.5px] border-adm-line bg-white text-[14px] font-bold">{t("content.cancel")}</button>
              <button type="button" disabled={busy} onClick={() => remove(confirmDelete)} className="h-[46px] rounded-xl bg-adm-danger text-[14px] font-bold text-white disabled:opacity-60">{t("platform.takwim.delete")}</button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: TakwimRow["status"] }) {
  const { t } = useT();
  return (
    <span className={`rounded-full px-2 py-0.5 text-[12px] font-extrabold ${status === "rasmi" ? "bg-adm-soft text-adm-green-dark" : "bg-[#FFF1D6] text-[#7A4700]"}`}>
      {t(`platform.takwim.status.${status}`)}
    </span>
  );
}

function YearTable({ year, rows, desktop, highlighted, onSaved, onError, onDelete }: {
  year: number; rows: TakwimRow[]; desktop: boolean; highlighted: Set<string>;
  onSaved: (text: string) => void; onError: (text: string) => void; onDelete: (d: TakwimDraft) => void;
}) {
  const { t } = useT();
  const grid = useMemo(() => yearGrid(rows, year), [rows, year]);
  if (desktop) {
    return (
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[980px] border-collapse text-left text-[14px]">
          <caption className="sr-only">{t("platform.takwim.caption", { year })}</caption>
          <thead>
            <tr className="border-b border-adm-hair text-[12px] font-bold text-adm-muted">
              {(["event", "date", "status", "note", "actions"] as const).map((c) => (
                <th key={c} scope="col" className={`px-4 py-3 ${c === "actions" ? "text-right" : ""}`}>{t(`platform.takwim.col.${c}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((d) => (
              <EventRow key={`${d.event_key}-${d.id ?? "new"}`} saved={d} desktop highlight={!!d.id && highlighted.has(d.id)} onSaved={onSaved} onError={onError} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-2.5">
      {grid.map((d) => (
        <EventRow key={`${d.event_key}-${d.id ?? "new"}`} saved={d} desktop={false} highlight={!!d.id && highlighted.has(d.id)} onSaved={onSaved} onError={onError} onDelete={onDelete} />
      ))}
    </ul>
  );
}

function EventRow({ saved, desktop, highlight, onSaved, onError, onDelete }: {
  saved: TakwimDraft; desktop: boolean; highlight: boolean;
  onSaved: (text: string) => void; onError: (text: string) => void; onDelete: (d: TakwimDraft) => void;
}) {
  const { t } = useT();
  const [d, setD] = useState<TakwimDraft>(saved);
  const [errors, setErrors] = useState<TakwimErrors>({});
  const [busy, setBusy] = useState(false);
  const label = ISLAMIC_EVENT_INFO[d.event_key].label;
  const dirty = draftChanged(d, saved) || (!saved.id && !!d.greg_date);
  const id = `tk-${d.event_key}`;

  const write = async (next: TakwimDraft, message: string) => {
    const e = validateTakwim(next);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const sb = getSupabase();
    const res = next.id
      ? await sb.from("islamic_events").update(takwimPayload(next)).eq("id", next.id)
      : await sb.from("islamic_events").upsert(takwimPayload(next), { onConflict: "event_key,hijri_year" });
    setBusy(false);
    if (res.error) return onError(t("platform.takwim.err.save", { message: res.error.message }));
    onSaved(message);
  };
  const save = () => write(d, t("platform.takwim.saved", { event: label, year: d.hijri_year }));
  const confirm = () => write({ ...saved, status: "rasmi" }, t("platform.takwim.confirmed", { event: label, year: d.hijri_year }));

  const event = (
    <span className="flex flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-2 font-bold">
        {label}
        {highlight && <span className="rounded-full bg-adm-ink px-2 py-0.5 text-[11px] font-extrabold text-adm-gold-soft">{t("platform.takwim.soon")}</span>}
      </span>
      <span className="text-[12px] text-adm-muted">{hijriDayOf(d.event_key)} {d.hijri_year}H</span>
    </span>
  );
  const dateInput = (
    <span className="flex flex-col gap-1">
      <input id={`${id}-date`} type="date" aria-label={t("platform.takwim.dateOf", { event: label })} value={d.greg_date} onChange={(e) => setD({ ...d, greg_date: e.target.value })} aria-invalid={Boolean(errors.greg_date)} className={`${input} ${errors.greg_date ? "border-adm-danger" : "border-adm-line"}`} />
      {errors.greg_date && <span className="text-[12px] font-semibold text-adm-danger">{t(`platform.takwim.err.date.${errors.greg_date}`)}</span>}
    </span>
  );
  const statusSelect = (
    <select aria-label={t("platform.takwim.statusOf", { event: label })} value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as TakwimDraft["status"] })} className={`${input} border-adm-line`}>
      <option value="jangkaan">{t("platform.takwim.status.jangkaan")}</option>
      <option value="rasmi">{t("platform.takwim.status.rasmi")}</option>
    </select>
  );
  const noteInput = (
    <span className="flex flex-col gap-1">
      <input aria-label={t("platform.takwim.noteOf", { event: label })} value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder={t("platform.takwim.notePlaceholder")} aria-invalid={Boolean(errors.note)} className={`${input} ${errors.note ? "border-adm-danger" : "border-adm-line"}`} />
      {errors.note && <span className="text-[12px] font-semibold text-adm-danger">{t("platform.takwim.err.note", { max: NOTE_MAX })}</span>}
    </span>
  );
  const actions = (
    <span className="flex flex-wrap items-center justify-end gap-1.5">
      {saved.id && saved.status === "jangkaan" && !dirty && (
        <button type="button" disabled={busy} onClick={confirm} className="h-10 rounded-xl bg-adm-green px-3.5 text-[13px] font-bold text-white disabled:opacity-60">{t("platform.takwim.confirm")}</button>
      )}
      <button type="button" disabled={busy || !dirty} onClick={save} className="h-10 rounded-xl border-[1.5px] border-adm-green bg-white px-3.5 text-[13px] font-bold text-adm-green disabled:opacity-40">
        {busy ? t("editor.saving") : t("platform.takwim.save")}
      </button>
      {saved.id && (
        <button type="button" disabled={busy} onClick={() => onDelete(saved)} aria-label={t("platform.takwim.deleteOf", { event: label })} className="h-10 rounded-xl px-2.5 text-[13px] font-bold text-adm-danger hover:bg-[#FDF3F0]">{t("platform.takwim.delete")}</button>
      )}
    </span>
  );

  if (desktop) {
    return (
      <tr className={`border-b border-adm-hair align-top last:border-0 ${highlight ? "bg-[#F4FAF7]" : ""}`}>
        <td className="px-4 py-3">{event}</td>
        <td className="w-[190px] px-4 py-3">{dateInput}</td>
        <td className="w-[150px] px-4 py-3">{statusSelect}</td>
        <td className="px-4 py-3">{noteInput}</td>
        <td className="w-[260px] px-4 py-3">{actions}</td>
      </tr>
    );
  }
  return (
    <li className={`${card} flex flex-col gap-3 p-3.5 ${highlight ? "ring-2 ring-adm-green" : ""}`}>
      {event}
      <div className="grid grid-cols-2 gap-2">
        {dateInput}
        {statusSelect}
      </div>
      {noteInput}
      {actions}
    </li>
  );
}
