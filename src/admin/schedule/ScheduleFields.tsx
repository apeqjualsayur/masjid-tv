"use client";
// Schedule form (PRD Phase 2 §4.5): start, optional end, seconds on screen, weekdays, priority,
// target screens (each with its layout; warns when only full screens are chosen, which never show
// announcements). Shared by the poster flow (2.8) and the template editor (2.9).
import { useId } from "react";
import { useT } from "../i18n";
import { DURATION, WEEKDAYS, targetsShowNoSlides, type Schedule, type ScheduleErrors, type ScheduleRules } from "./logic";

const label = "text-[13px] font-bold text-[#3A4E45]";
const input = "h-12 w-full min-w-0 rounded-xl border bg-white px-3 text-[16px] text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-green";
const err = "text-[13px] font-semibold text-adm-danger";

function Switch({ on, onChange, labelledBy }: { on: boolean; onChange: (v: boolean) => void; labelledBy: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-[46px] flex-none rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green ${on ? "bg-adm-green" : "bg-[#B9C8C0]"}`}
    >
      <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-[left] ${on ? "left-[21px]" : "left-[3px]"}`} />
    </button>
  );
}

export function ScheduleFields({
  value,
  onChange,
  errors = {},
  screens,
  rules = {},
}: {
  value: Schedule;
  onChange: (s: Schedule) => void;
  errors?: ScheduleErrors;
  screens: { id: string; name: string; layout: string }[];
  rules?: ScheduleRules;
}) {
  const { t } = useT();
  const id = useId();
  const set = (patch: Partial<Schedule>) => onChange({ ...value, ...patch });
  const toggleDay = (d: number) => set({ days: value.days.includes(d) ? value.days.filter((x) => x !== d) : [...value.days, d] });
  const selected = value.screenIds ?? [];

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[15px] font-extrabold">
          {t("schedule.startDate")} <span className="text-[12px] font-semibold text-adm-muted">· {t("schedule.timezone")}</span>
        </legend>
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2">
          <input type="date" aria-label={t("schedule.startDate")} value={value.startDate} onChange={(e) => set({ startDate: e.target.value })} aria-invalid={Boolean(errors.start)} className={`${input} ${errors.start ? "border-adm-danger" : "border-adm-line"}`} />
          <input type="time" aria-label={t("schedule.startTime")} value={value.startTime} onChange={(e) => set({ startTime: e.target.value })} aria-invalid={Boolean(errors.start)} className={`${input} ${errors.start ? "border-adm-danger" : "border-adm-line"}`} />
        </div>
        {errors.start && <p className={err}>{t(errors.start)}</p>}
      </fieldset>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span id={`${id}-end`} className="text-[15px] font-semibold">{t("schedule.hasEnd")}</span>
          {!rules.endRequired && <Switch on={value.hasEnd} onChange={(v) => set({ hasEnd: v })} labelledBy={`${id}-end`} />}
        </div>
        {value.hasEnd && (
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2">
            <input type="date" aria-label={t("schedule.endDate")} value={value.endDate} onChange={(e) => set({ endDate: e.target.value })} aria-invalid={Boolean(errors.end)} className={`${input} ${errors.end ? "border-adm-danger" : "border-adm-line"}`} />
            <input type="time" aria-label={t("schedule.endTime")} value={value.endTime} onChange={(e) => set({ endTime: e.target.value })} aria-invalid={Boolean(errors.end)} className={`${input} ${errors.end ? "border-adm-danger" : "border-adm-line"}`} />
          </div>
        )}
        {errors.end && <p className={err}>{t(errors.end)}</p>}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span id={`${id}-dur`} className="text-[15px] font-semibold">{t("schedule.duration")}</span>
        <div className="flex items-center gap-1" role="group" aria-labelledby={`${id}-dur`}>
          <button type="button" aria-label={t("schedule.less")} disabled={value.durationS <= DURATION.min} onClick={() => set({ durationS: Math.max(DURATION.min, value.durationS - 5) })} className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-adm-line bg-white text-[20px] disabled:opacity-40">
            −
          </button>
          <output aria-live="polite" className="w-[78px] text-center text-[15px] font-extrabold">{t("schedule.durationValue", { n: value.durationS })}</output>
          <button type="button" aria-label={t("schedule.more")} disabled={value.durationS >= DURATION.max} onClick={() => set({ durationS: Math.min(DURATION.max, value.durationS + 5) })} className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-adm-line bg-white text-[20px] disabled:opacity-40">
            +
          </button>
        </div>
      </div>
      {errors.duration && <p className={err}>{t(errors.duration)}</p>}

      <div className="flex flex-col gap-2">
        <span id={`${id}-days`} className={label}>{t("schedule.days")}</span>
        <div role="group" aria-labelledby={`${id}-days`} className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => {
            const on = value.days.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                aria-label={t(`schedule.dayFull.${d}`)}
                onClick={() => toggleDay(d)}
                className={`h-11 rounded-xl border-[1.5px] text-[13px] font-bold focus-visible:outline-2 focus-visible:outline-adm-green ${on ? "border-adm-green bg-adm-green text-white" : "border-adm-line bg-white text-adm-muted"}`}
              >
                {t(`schedule.day.${d}`)}
              </button>
            );
          })}
        </div>
        <p className="text-[12px] text-adm-muted">{value.days.length === 0 || value.days.length === 7 ? t("schedule.everyDay") : t("schedule.daysHint")}</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span id={`${id}-pri`} className="text-[15px] font-semibold">{t("schedule.priority")}</span>
          <span className="text-[12px] text-adm-muted">{t("schedule.priorityHint")}</span>
        </div>
        <Switch on={value.priority} onChange={(v) => set({ priority: v })} labelledBy={`${id}-pri`} />
      </div>

      {screens.length > 1 && (
        <div className="flex flex-col gap-2">
          <span id={`${id}-scr`} className={label}>{t("schedule.screens")}</span>
          <div role="radiogroup" aria-labelledby={`${id}-scr`} className="grid grid-cols-2 rounded-xl bg-[#E3ECE7] p-1">
            {[
              [true, t("schedule.allScreens")],
              [false, t("schedule.someScreens")],
            ].map(([all, text]) => {
              const on = (value.screenIds === null) === all;
              return (
                <button
                  key={String(all)}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ screenIds: all ? null : screens.map((s) => s.id) })}
                  className={`h-10 rounded-[9px] text-[14px] font-bold ${on ? "bg-white text-adm-ink shadow-[0_1px_3px_rgba(18,38,30,0.12)]" : "text-adm-muted"}`}
                >
                  {text}
                </button>
              );
            })}
          </div>
          {value.screenIds !== null && (
            <ul className="flex flex-col gap-1">
              {screens.map((s) => {
                const on = selected.includes(s.id);
                return (
                  <li key={s.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-adm-ground">
                      <input type="checkbox" checked={on} onChange={() => set({ screenIds: on ? selected.filter((x) => x !== s.id) : [...selected, s.id] })} className="h-5 w-5 accent-[#146C4A]" />
                      <span className="text-[15px]">{t("schedule.screenOption", { name: s.name, layout: t(`layout.${s.layout}`) })}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {errors.screens && <p className={err}>{t(errors.screens)}</p>}
        </div>
      )}
      {targetsShowNoSlides(value.screenIds, screens) && (
        <p role="status" className="rounded-xl bg-[#FFF4DF] px-3.5 py-3 text-[13px] leading-[1.5] text-[#6B4A12]">
          <b>{t("schedule.noSlidesWarning")}</b> {t("schedule.noSlidesHint")}
        </p>
      )}
    </div>
  );
}