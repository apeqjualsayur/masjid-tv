"use client";
// Selaraskan dengan angka sebenar (PRD usage §7.5): actual Egress / Cached Egress from Supabase → Usage
// → rpc usage_calibrate. Date ≤ today (Malaysian), GB 0–100,000.
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useT } from "../i18n";
import { fmtLongDate } from "./format";
import type { UsageReport } from "./types";
import { card, fieldLabel, h2, hint, input, note, primaryBtn } from "./ui";

export const GB_MAX = 100_000;

/** i18n key of the first problem, or null. Cached egress may be empty. */
export function calibrationError(date: string, today: string, egress: string, cached: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return "usage.calibrate.badDate";
  const bad = (s: string, required: boolean) => {
    if (s.trim() === "") return required;
    const v = Number(s);
    return !Number.isFinite(v) || v < 0 || v > GB_MAX;
  };
  if (bad(egress, true) || bad(cached, false)) return "usage.calibrate.badValue";
  return null;
}

export function CalibrationForm({ r, onSaved, toast }: { r: UsageReport; onSaved: () => void; toast: (kind: "ok" | "error", text: string) => void }) {
  const { t, locale } = useT();
  const today = r.cycle.today;
  const [date, setDate] = useState(today);
  const [egress, setEgress] = useState("");
  const [cached, setCached] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cal = r.calibration;

  const save = async () => {
    const e = calibrationError(date, today, egress, cached);
    setErr(e);
    if (e) return;
    setSaving(true);
    const { data, error } = await getSupabase().rpc("usage_calibrate", {
      p_measured_on: date,
      p_egress_gb: Number(egress),
      p_cached_gb: cached.trim() === "" ? null : Number(cached),
    });
    setSaving(false);
    if (error) {
      const known = /bad_date/.test(error.message) ? "usage.calibrate.badDate" : /bad_value/.test(error.message) ? "usage.calibrate.badValue" : null;
      if (known) setErr(known);
      toast("error", known ? t(known) : t("usage.calibrate.error", { message: error.message }));
      return;
    }
    const f = (data as { factor_egress?: number | null } | null)?.factor_egress;
    toast("ok", f != null ? t("usage.calibrate.saved", { f: Number(f).toFixed(2) }) : t("usage.calibrate.savedPlain"));
    setEgress("");
    setCached("");
    onSaved();
  };

  return (
    <section aria-labelledby="usage-cal" className={card}>
      <div className="flex flex-col gap-1">
        <h2 id="usage-cal" className={h2}>{t("usage.calibrate.title")}</h2>
        <p className={hint}>{t("usage.calibrate.hint")}</p>
      </div>
      <p className={note}>
        {cal
          ? t("usage.calibrate.last", {
              date: fmtLongDate(cal.measured_on, locale),
              eg: cal.egress_gb,
              ce: cal.cached_egress_gb ?? "—",
              fe: cal.factor_egress ?? "—",
              fc: cal.factor_cached ?? "—",
            })
          : t("usage.calibrate.never")}
      </p>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] items-end gap-2.5"
      >
        <label className={fieldLabel}>
          {t("usage.calibrate.date")}
          <input type="date" required max={today} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={err === "usage.calibrate.badDate"} aria-describedby="usage-cal-err" className={input} />
        </label>
        <label className={fieldLabel}>
          {t("usage.calibrate.egress")}
          <input type="number" required min={0} max={GB_MAX} step="0.001" inputMode="decimal" value={egress} onChange={(e) => setEgress(e.target.value)} aria-invalid={err === "usage.calibrate.badValue"} aria-describedby="usage-cal-err" className={input} />
        </label>
        <label className={fieldLabel}>
          {t("usage.calibrate.cached")}
          <input type="number" min={0} max={GB_MAX} step="0.001" inputMode="decimal" value={cached} onChange={(e) => setCached(e.target.value)} aria-invalid={err === "usage.calibrate.badValue"} aria-describedby="usage-cal-err" className={input} />
        </label>
        <button type="submit" disabled={saving} className={primaryBtn}>{t("usage.calibrate.save")}</button>
      </form>
      <p id="usage-cal-err" role={err ? "alert" : undefined} className={`text-[13px] font-semibold text-adm-danger ${err ? "" : "hidden"}`}>{err ? t(err) : ""}</p>
      <div className={note}>
        {t("usage.calibrate.how")}
        <ol className="mt-1 list-decimal pl-5">
          <li>{t("usage.calibrate.step1")}</li>
          <li>{t("usage.calibrate.step2")}</li>
          <li>{t("usage.calibrate.step3")}</li>
        </ol>
      </div>
    </section>
  );
}
