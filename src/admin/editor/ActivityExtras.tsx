"use client";
// Countdown fields for kuliah / program / mesyuarat (PRD enhancements §4.1, §4.3): "Papar kiraan detik"
// (missing = on), an optional duration for "Sedang berlangsung", and "Pratonton pada…" for the preview.
import { activityEventAt, localParts, pad2, parseLocalDateTime } from "@/core";
import { DURATION_MIN } from "@/templates";
import type { FieldErrors, Fields } from "@/templates/schema";
import { useT } from "../i18n";

const label = "text-[13px] font-bold text-[#3A4E45]";
const box = "w-full min-w-0 rounded-xl border bg-white px-3 text-[16px] text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-green";

/** epoch ms → "YYYY-MM-DDTHH:MM" in Malaysia time (for <input type="datetime-local">). */
export function toLocalInput(ms: number): string {
  const p = localParts(ms);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function ActivityExtrasFields({ fields, onChange, errors, previewAt, onPreviewAt }: {
  fields: Fields;
  onChange: (f: Fields) => void;
  errors: FieldErrors;
  previewAt: number | null;
  onPreviewAt: (ms: number | null) => void;
}) {
  const { t } = useT();
  const on = fields.showCountdown !== false;
  const event = activityEventAt(fields);
  const err = errors.durationMin;
  const dur = fields.durationMin;
  const set = (k: string, v: unknown) => {
    const out = { ...fields };
    if (v === undefined) delete out[k];
    else out[k] = v;
    onChange(out);
  };

  return (
    <fieldset className="flex flex-col gap-3 rounded-[14px] border border-adm-hair bg-[#F7FAF8] p-3.5">
      <legend className="sr-only">{t("editor.countdown.legend")}</legend>
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span id="cd-show" className="text-[15px] font-bold">{t("editor.countdown.show")}</span>
          <span className="text-[12px] leading-[1.4] text-adm-muted">{event ? t("editor.countdown.hint") : t("editor.countdown.needsDate")}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="cd-show"
          onClick={() => set("showCountdown", on ? false : undefined)}
          className={`relative h-7 w-[46px] flex-none rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green ${on ? "bg-adm-green" : "bg-[#C3D1CA]"}`}
        >
          <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-[left] ${on ? "left-[21px]" : "left-[3px]"}`} />
        </button>
      </div>

      {on && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-durationMin" className={label}>{t("editor.countdown.duration")}</label>
          <input
            id="f-durationMin"
            inputMode="numeric"
            placeholder={String(DURATION_MIN.default)}
            defaultValue={typeof dur === "number" ? String(dur) : ""}
            onChange={(e) => {
              const v = e.target.value.trim();
              set("durationMin", v === "" ? undefined : Number(v));
            }}
            aria-invalid={Boolean(err)}
            aria-describedby="f-durationMin-hint"
            className={`${box} h-12 ${err ? "border-adm-danger" : "border-adm-line"}`}
          />
          <span id="f-durationMin-hint" className="text-[12px] text-adm-muted">{t("editor.countdown.durationHint", { min: DURATION_MIN.min, max: DURATION_MIN.max })}</span>
          {err && <p className="text-[13px] font-semibold text-adm-danger">{t(`editor.err.${err.code}`, { min: err.min ?? "", max: err.max ?? "" })}</p>}
        </div>
      )}

      {on && event && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-previewAt" className={label}>{t("editor.countdown.previewAt")}</label>
          <input
            id="f-previewAt"
            type="datetime-local"
            value={previewAt === null ? "" : toLocalInput(previewAt)}
            onChange={(e) => onPreviewAt(e.target.value ? parseLocalDateTime(e.target.value) : null)}
            className={`${box} h-12 border-adm-line`}
          />
          <div className="flex flex-wrap gap-2">
            {event.atMs !== null && (
              <button type="button" onClick={() => onPreviewAt(event.atMs! - 59 * 60_000)} className="h-10 rounded-[10px] border border-adm-line bg-white px-3 text-[13px] font-bold">
                {t("editor.countdown.previewBefore")}
              </button>
            )}
            {previewAt !== null && (
              <button type="button" onClick={() => onPreviewAt(null)} className="h-10 rounded-[10px] px-3 text-[13px] font-bold text-adm-green">
                {t("editor.countdown.previewNow")}
              </button>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
}
