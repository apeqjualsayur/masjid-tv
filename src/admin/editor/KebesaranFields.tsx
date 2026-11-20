"use client";
// Hari Kebesaran editor extras (PRD enhancements §5.5): which events the slide includes (default all
// 9), and a read-only list of the dates loaded in the platform takwim for the next 12 months. The dates
// are never edited here: the platform owner enters them from JAKIM's takwim.
import { ISLAMIC_EVENT_INFO, ISLAMIC_EVENT_KEYS, localDateKey, type IslamicEventKey } from "@/core";
import type { FieldErrors, Fields } from "@/templates/schema";
import { useT } from "../i18n";
import { upcomingYear, type TakwimRow } from "../platform/takwim";

export function KebesaranFields({ fields, onChange, errors, takwim, takwimError }: {
  fields: Fields;
  onChange: (f: Fields) => void;
  errors: FieldErrors;
  takwim: TakwimRow[] | null;
  takwimError: string | null;
}) {
  const { t, locale } = useT();
  const chosen: IslamicEventKey[] = Array.isArray(fields.events) ? ISLAMIC_EVENT_KEYS.filter((k) => (fields.events as string[]).includes(k)) : [...ISLAMIC_EVENT_KEYS];
  const set = (next: IslamicEventKey[]) => {
    const out = { ...fields };
    // All nine = the default: store nothing, so events added to the list later are included too.
    if (next.length === ISLAMIC_EVENT_KEYS.length) delete out.events;
    else out.events = ISLAMIC_EVENT_KEYS.filter((k) => next.includes(k));
    onChange(out);
  };
  const toggle = (k: IslamicEventKey) => set(chosen.includes(k) ? chosen.filter((x) => x !== k) : [...chosen, k]);
  const upcoming = upcomingYear(takwim ?? [], localDateKey(Date.now()));
  const fmt = (d: string) => new Date(`${d}T12:00:00+08:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });
  const err = errors.events;

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13px] font-bold text-[#3A4E45]">{t("editor.kebesaran.events")}</legend>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {ISLAMIC_EVENT_KEYS.map((k) => (
            <label key={k} className="flex min-h-11 items-center gap-3 rounded-xl border border-adm-line bg-white px-3 text-[15px]">
              <input type="checkbox" checked={chosen.includes(k)} onChange={() => toggle(k)} className="h-5 w-5 flex-none accent-[#146C4A]" />
              <span className="flex flex-col">
                <span className="font-semibold">{ISLAMIC_EVENT_INFO[k].label}</span>
                <span className="text-[12px] text-adm-muted">{ISLAMIC_EVENT_INFO[k].hijriDay} {ISLAMIC_EVENT_INFO[k].hijriMonth}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => set([...ISLAMIC_EVENT_KEYS])} className="h-10 px-1 text-[13px] font-bold text-adm-green">{t("editor.kebesaran.all")}</button>
          <button type="button" onClick={() => set([])} className="h-10 px-1 text-[13px] font-bold text-adm-muted">{t("editor.kebesaran.none")}</button>
        </div>
        {err && <p role="alert" className="text-[13px] font-semibold text-adm-danger">{t("editor.kebesaran.err.events")}</p>}
      </fieldset>

      <section aria-labelledby="hk-dates" className="flex flex-col gap-2 rounded-[14px] border border-adm-hair bg-[#F7FAF8] p-3.5">
        <h3 id="hk-dates" className="text-[13px] font-extrabold tracking-[0.06em] text-adm-muted uppercase">{t("editor.kebesaran.datesTitle")}</h3>
        {takwimError ? (
          <p role="alert" className="text-[13px] text-adm-danger">{t("editor.kebesaran.loadError", { message: takwimError })}</p>
        ) : !takwim ? (
          <p className="text-[13px] text-adm-muted">{t("app.loading")}</p>
        ) : upcoming.length === 0 ? (
          <p className="rounded-xl bg-[#FFF4DF] px-3 py-2.5 text-[13px] leading-[1.45] text-[#6B4A12]">{t("editor.kebesaran.noDates")}</p>
        ) : (
          <ul className="flex flex-col">
            {upcoming.map((r) => (
              <li key={r.id} className={`flex flex-wrap items-center justify-between gap-2 border-t border-adm-hair py-2 text-[14px] first:border-0 ${chosen.includes(r.event_key) ? "" : "opacity-50"}`}>
                <span className="font-semibold">{ISLAMIC_EVENT_INFO[r.event_key].label}</span>
                <span className="flex items-center gap-2 text-adm-muted">
                  {fmt(r.greg_date)}
                  {r.status === "jangkaan" && <span className="rounded-full bg-[#FFF1D6] px-2 py-0.5 text-[11px] font-extrabold text-[#7A4700]">{t("platform.takwim.status.jangkaan")}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[12px] leading-[1.45] text-adm-muted">{t("editor.kebesaran.source")}</p>
      </section>
    </div>
  );
}
