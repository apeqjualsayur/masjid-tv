"use client";
// Form generated from src/templates/schema.ts: one input per field type, no per-template code.
// Values follow the template types the TV renders (display strings for dates and times).
import { useRef } from "react";
import {
  AYAT_SOURCES, TEMPLATES, TIME_CHOICES, applyAyat, fixedRowLabel, formatClockBm, formatDateBm, formatRangeBm, getPath, parseClockBm, setPath,
  type FieldDef, type FieldErrors, type Fields, type SelectField, type TableField,
} from "@/templates/schema";
import type { TemplateKey } from "@/templates";
import { useT } from "../i18n";
import { ICON, Icon } from "../shell/icons";

const label = "text-[13px] font-bold text-[#3A4E45]";
const box = "w-full min-w-0 rounded-xl border bg-white px-3 text-[16px] text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-green";
const OTHER = "__other";

export interface ImageState {
  /** What to show: a new local picture or the saved one. */
  url: string | null;
  busy: boolean;
}

interface Props {
  templateKey: TemplateKey;
  fields: Fields;
  onChange: (f: Fields) => void;
  errors: FieldErrors;
  images: Record<string, ImageState>;
  onPickImage: (key: string, file: File) => void;
  onRemoveImage: (key: string) => void;
}

function ErrorText({ e }: { e?: FieldErrors[string] }) {
  const { t } = useT();
  if (!e) return null;
  return <p className="text-[13px] font-semibold text-adm-danger">{t(`editor.err.${e.code}`, { max: e.max ?? "", min: e.min ?? "" })}</p>;
}

const num = (s: string): number | undefined => {
  const v = s.trim().replace(/,/g, "");
  if (v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export function TemplateForm({ templateKey, fields, onChange, errors, images, onPickImage, onRemoveImage }: Props) {
  const { lang } = useT();
  const meta = TEMPLATES[templateKey];
  const set = (path: string, value: unknown) => onChange(setPath(fields, path, value));
  return (
    <div className="flex flex-col gap-4">
      {meta.fields.map((d) => (
        <FieldInput key={d.key} d={d} fields={fields} set={set} onChange={onChange} errors={errors} lang={lang} image={images[d.key]} onPickImage={onPickImage} onRemoveImage={onRemoveImage} />
      ))}
    </div>
  );
}

function FieldInput({ d, fields, set, onChange, errors, lang, image, onPickImage, onRemoveImage }: {
  d: FieldDef; fields: Fields; set: (p: string, v: unknown) => void; onChange: (f: Fields) => void; errors: FieldErrors; lang: "ms" | "en";
  image?: ImageState; onPickImage: Props["onPickImage"]; onRemoveImage: Props["onRemoveImage"];
}) {
  const { t } = useT();
  const id = `f-${d.key.replace(/\./g, "-")}`;
  const v = getPath(fields, d.key);
  const err = errors[d.key];
  const bd = err ? "border-adm-danger" : "border-adm-line";
  const lbl = (
    <label htmlFor={id} className={label}>
      {d.label[lang]}
    </label>
  );
  const ph = d.placeholder?.[lang];

  switch (d.type) {
    case "text":
      return (
        <div className="flex flex-col gap-1.5">
          {lbl}
          <input id={id} value={typeof v === "string" ? v : ""} maxLength={d.max} placeholder={ph} onChange={(e) => set(d.key, e.target.value)} aria-invalid={Boolean(err)} className={`${box} ${bd} h-12`} />
          <ErrorText e={err} />
        </div>
      );
    case "longtext": {
      const s = typeof v === "string" ? v : "";
      return (
        <div className="flex flex-col gap-1.5">
          {lbl}
          <textarea id={id} value={s} maxLength={d.max} rows={3} placeholder={ph} onChange={(e) => set(d.key, e.target.value)} aria-invalid={Boolean(err)} className={`${box} ${bd} resize-none py-2.5 leading-[1.45]`} />
          <span aria-hidden="true" className="self-end text-[11px] text-adm-muted">{[...s].length}/{d.max}</span>
          <ErrorText e={err} />
        </div>
      );
    }
    case "number":
    case "money":
      return (
        <div className="flex flex-col gap-1.5">
          {lbl}
          <input
            id={id}
            inputMode={d.type === "money" ? "decimal" : "numeric"}
            defaultValue={typeof v === "number" && Number.isFinite(v) ? String(v) : ""}
            onChange={(e) => set(d.key, num(e.target.value))}
            aria-invalid={Boolean(err)}
            className={`${box} ${bd} h-12`}
          />
          <ErrorText e={err} />
        </div>
      );
    case "date": {
      const isoKey = `${d.key}Iso`;
      const iso = getPath(fields, isoKey);
      if (d.range) {
        const [a, b] = Array.isArray(iso) ? (iso as string[]) : ["", ""];
        const update = (na: string, nb: string) => onChange(setPath(setPath(fields, isoKey, [na, nb]), d.key, na && nb ? formatRangeBm(na, nb) : ""));
        return (
          <fieldset className="flex flex-col gap-1.5">
            <legend className={`${label} mb-1.5`}>{d.label[lang]}</legend>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" aria-label={`${d.label[lang]}: ${t("editor.date.from")}`} value={a} onChange={(e) => update(e.target.value, b && b >= e.target.value ? b : e.target.value ? addDays(e.target.value, 6) : "")} aria-invalid={Boolean(err)} className={`${box} ${bd} h-12`} />
              <input type="date" aria-label={`${d.label[lang]}: ${t("editor.date.to")}`} value={b} min={a || undefined} onChange={(e) => update(a, e.target.value)} aria-invalid={Boolean(err)} className={`${box} ${bd} h-12`} />
            </div>
            {typeof v === "string" && v && <span className="text-[12px] text-adm-muted">{v}</span>}
            <ErrorText e={err} />
          </fieldset>
        );
      }
      return (
        <div className="flex flex-col gap-1.5">
          {lbl}
          <input
            id={id}
            type="date"
            value={typeof iso === "string" ? iso : ""}
            onChange={(e) => onChange(setPath(setPath(fields, isoKey, e.target.value || undefined), d.key, e.target.value ? formatDateBm(e.target.value) : ""))}
            aria-invalid={Boolean(err)}
            className={`${box} ${bd} h-12`}
          />
          {typeof v === "string" && v && <span className="text-[12px] text-adm-muted">{v}</span>}
          <ErrorText e={err} />
        </div>
      );
    }
    case "time-choice": {
      const s = typeof v === "string" ? v : "";
      const choice = (TIME_CHOICES as readonly string[]).includes(s) ? s : s ? OTHER : "";
      const clock = parseClockBm(s) ?? "";
      return (
        <div className="flex flex-col gap-1.5">
          {lbl}
          <select
            id={id}
            value={choice}
            onChange={(e) => set(d.key, e.target.value === OTHER ? formatClockBm(clock || "20:30") : e.target.value)}
            aria-invalid={Boolean(err)}
            className={`${box} ${bd} h-12`}
          >
            <option value="">{t("editor.time.choose")}</option>
            {TIME_CHOICES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value={OTHER}>{t("editor.time.other")}</option>
          </select>
          {choice === OTHER && (
            <input type="time" aria-label={`${d.label[lang]}: ${t("editor.time.otherLabel")}`} value={clock} onChange={(e) => set(d.key, e.target.value ? formatClockBm(e.target.value) : "")} className={`${box} border-adm-line h-12`} />
          )}
          <ErrorText e={err} />
        </div>
      );
    }
    case "select":
      return d.options.some((o) => o.detail) ? <AyatChooser d={d} fields={fields} onChange={onChange} lang={lang} errors={errors} /> : (
        <div className="flex flex-col gap-1.5">
          {lbl}
          <select id={id} value={typeof v === "string" ? v : ""} onChange={(e) => set(d.key, e.target.value)} aria-invalid={Boolean(err)} className={`${box} ${bd} h-12`}>
            {d.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label[lang]}</option>
            ))}
          </select>
          <ErrorText e={err} />
        </div>
      );
    case "image":
      return <ImageInput d={d} lang={lang} state={image} onPick={(f) => onPickImage(d.key, f)} onRemove={() => onRemoveImage(d.key)} />;
    case "table":
      return <TableInput d={d} fields={fields} set={set} errors={errors} lang={lang} />;
  }
}

function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function AyatChooser({ d, fields, onChange, lang, errors }: { d: SelectField; fields: Fields; onChange: (f: Fields) => void; lang: "ms" | "en"; errors: FieldErrors }) {
  const chosen = fields[d.key];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${label} mb-1.5`}>{d.label[lang]}</legend>
      <div role="radiogroup" className="flex flex-col gap-2">
        {AYAT_SOURCES.map((a) => {
          const on = chosen === a.id;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(applyAyat(fields, a.id))}
              className={`flex flex-col gap-1.5 rounded-[14px] border-[1.5px] p-3 text-left focus-visible:outline-2 focus-visible:outline-adm-green ${on ? "border-adm-green bg-[#F1F8F4]" : "border-adm-line bg-white"}`}
            >
              <span className="text-[13px] font-extrabold text-adm-green-dark">{a.reference}</span>
              <span dir="rtl" lang="ar" className="font-naskh text-[20px] leading-[1.7]">{a.arabic}</span>
              <span className="text-[13px] leading-[1.45] text-adm-muted">{a.translation}</span>
            </button>
          );
        })}
      </div>
      <ErrorText e={errors[d.key]} />
    </fieldset>
  );
}

function ImageInput({ d, lang, state, onPick, onRemove }: { d: FieldDef; lang: "ms" | "en"; state?: ImageState; onPick: (f: File) => void; onRemove: () => void }) {
  const { t } = useT();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <span className={label}>{d.label[lang]}</span>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
      <div className="flex items-center gap-3">
        {state?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.url} alt="" className="h-16 w-16 flex-none rounded-xl bg-white object-contain ring-1 ring-adm-hair" />
        ) : (
          <span aria-hidden="true" className="flex h-16 w-16 flex-none items-center justify-center rounded-xl border-[1.5px] border-dashed border-[#A9C2B5] text-adm-muted">
            <Icon d={ICON.poster} size={24} />
          </span>
        )}
        <div className="flex flex-col items-start gap-1">
          <button type="button" disabled={state?.busy} onClick={() => ref.current?.click()} className="h-10 rounded-[10px] border border-adm-line bg-white px-3.5 text-[13px] font-bold disabled:opacity-50">
            {state?.busy ? t("editor.image.working") : state?.url ? t("editor.image.change") : t("editor.image.add")}
          </button>
          {state?.url && !state.busy && (
            <button type="button" onClick={onRemove} className="h-8 px-1 text-[13px] font-bold text-adm-danger">
              {t("editor.image.remove")}
            </button>
          )}
          <span className="text-[11px] text-adm-muted">{t("editor.image.hint")}</span>
        </div>
      </div>
    </div>
  );
}

function TableInput({ d, fields, set, errors, lang }: { d: TableField; fields: Fields; set: (p: string, v: unknown) => void; errors: FieldErrors; lang: "ms" | "en" }) {
  const { t } = useT();
  const rows = (Array.isArray(getPath(fields, d.key)) ? (getPath(fields, d.key) as Fields[]) : []) as Fields[];
  const fixed = Boolean(d.fixedRows);
  const update = (i: number, key: string, value: unknown) => set(d.key, rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const empty = () => Object.fromEntries(d.columns.map((c) => [c.key, c.type === "money" ? undefined : ""]));
  const cols = `${fixed ? "84px " : ""}${d.columns.map((c) => (c.type === "money" ? "112px" : "minmax(0,1fr)")).join(" ")}${fixed ? "" : " 40px"}`;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${label} mb-1.5`}>{d.label[lang]}</legend>
      <div className="grid gap-1.5 text-[12px] font-bold text-adm-muted" style={{ gridTemplateColumns: cols }}>
        {fixed && <span />}
        {d.columns.map((c) => (
          <span key={c.key}>{c.label[lang]}</span>
        ))}
        {!fixed && <span />}
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid items-start gap-1.5" style={{ gridTemplateColumns: cols }}>
          {fixed && <span className="flex h-11 items-center text-[14px] font-bold">{fixedRowLabel(String(r[d.fixedRows![0].key] ?? ""))}</span>}
          {d.columns.map((c) => {
            const e = errors[`${d.key}.${i}.${c.key}`];
            const aria = `${d.label[lang]} ${fixed ? fixedRowLabel(String(r[d.fixedRows![0].key] ?? "")) : i + 1}: ${c.label[lang]}`;
            return c.type === "money" ? (
              <input key={c.key} aria-label={aria} inputMode="decimal" defaultValue={typeof r[c.key] === "number" ? String(r[c.key]) : ""} onChange={(ev) => update(i, c.key, num(ev.target.value))} aria-invalid={Boolean(e)} className={`${box} h-11 text-right ${e ? "border-adm-danger" : "border-adm-line"}`} />
            ) : (
              <input key={c.key} aria-label={aria} value={typeof r[c.key] === "string" ? (r[c.key] as string) : ""} maxLength={c.max} onChange={(ev) => update(i, c.key, ev.target.value)} aria-invalid={Boolean(e)} className={`${box} h-11 ${e ? "border-adm-danger" : "border-adm-line"}`} />
            );
          })}
          {!fixed && (
            <button type="button" aria-label={t("editor.removeRow", { n: i + 1 })} disabled={rows.length <= (d.minRows ?? 0)} onClick={() => set(d.key, rows.filter((_, j) => j !== i))} className="flex h-11 w-10 items-center justify-center rounded-xl text-adm-muted hover:text-adm-danger disabled:opacity-30">
              <Icon d={ICON.close} size={16} />
            </button>
          )}
        </div>
      ))}
      {!fixed && rows.length < (d.maxRows ?? 99) && (
        <button type="button" onClick={() => set(d.key, [...rows, empty()])} className="h-10 self-start px-1 text-[14px] font-bold text-adm-green">
          {t("editor.addRow")}
        </button>
      )}
      <ErrorText e={errors[d.key]} />
    </fieldset>
  );
}