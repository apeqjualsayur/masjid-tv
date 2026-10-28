"use client";
// Pelan dan kadar (PRD usage §7.6): Supabase plan, compute, Resend plan, cycle day, fx, domain
// → rpc usage_update_settings. Limits and prices themselves are edited in SQL (rare).
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useT } from "../i18n";
import { fmtLongDate } from "./format";
import type { ComputeSize, ResendPlan, SupabasePlan, UsageReport } from "./types";
import { card, fieldLabel, h2, hint, input, primaryBtn } from "./ui";

const COMPUTE: ComputeSize[] = ["nano", "micro", "small", "medium", "large"];

export interface PlanValues {
  plan: SupabasePlan;
  compute: ComputeSize;
  resend: ResendPlan;
  cycleDay: string;
  fx: string;
  domain: string;
}

/** True when the numbers are in range (matches the database checks). */
export function planValid(v: PlanValues): boolean {
  const day = Number(v.cycleDay);
  const fx = Number(v.fx);
  const dom = Number(v.domain);
  return Number.isInteger(day) && day >= 1 && day <= 28 && Number.isFinite(fx) && fx >= 3 && fx <= 6 && v.domain.trim() !== "" && Number.isFinite(dom) && dom >= 0 && dom <= 999999;
}

export function PlanSettingsForm({ r, onSaved, toast }: { r: UsageReport; onSaved: () => void; toast: (kind: "ok" | "error", text: string) => void }) {
  const { t, locale } = useT();
  const s = r.settings;
  const [v, setV] = useState<PlanValues>({
    plan: s.plan, compute: s.compute, resend: s.resend_plan,
    cycleDay: String(s.cycle_day), fx: String(s.fx_rm_per_usd), domain: String(s.domain_rm_per_year),
  });
  const [bad, setBad] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof PlanValues>(k: K, val: PlanValues[K]) => setV((o) => ({ ...o, [k]: val }));

  const save = async () => {
    const ok = planValid(v);
    setBad(!ok);
    if (!ok) return;
    setSaving(true);
    const { error } = await getSupabase().rpc("usage_update_settings", {
      p_cycle_day: Number(v.cycleDay), p_plan: v.plan, p_compute: v.compute, p_resend_plan: v.resend,
      p_fx: Number(v.fx), p_domain_rm: Number(v.domain),
    });
    setSaving(false);
    if (error) {
      toast("error", t("usage.plan.error", { message: error.message }));
      return;
    }
    toast("ok", t("usage.plan.saved"));
    onSaved();
  };

  return (
    <section aria-labelledby="usage-plan" className={card}>
      <div className="flex flex-col gap-1">
        <h2 id="usage-plan" className={h2}>{t("usage.plan.title")}</h2>
        <p className={hint}>{t("usage.plan.hint")}</p>
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] items-end gap-2.5"
      >
        <label className={fieldLabel}>
          {t("usage.plan.supabase")}
          <select value={v.plan} onChange={(e) => set("plan", e.target.value as SupabasePlan)} className={input}>
            <option value="free">{t("usage.scale.free")}</option>
            <option value="pro">{t("usage.scale.pro")}</option>
          </select>
        </label>
        <label className={fieldLabel}>
          {t("usage.plan.compute")}
          <select value={v.compute} onChange={(e) => set("compute", e.target.value as ComputeSize)} className={input}>
            {COMPUTE.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className={fieldLabel}>
          {t("usage.plan.resend")}
          <select value={v.resend} onChange={(e) => set("resend", e.target.value as ResendPlan)} className={input}>
            <option value="free">{t("usage.scale.free")}</option>
            <option value="pro">{t("usage.scale.pro")}</option>
          </select>
        </label>
        <label className={fieldLabel}>
          {t("usage.plan.cycleDay")}
          <input type="number" min={1} max={28} step={1} inputMode="numeric" value={v.cycleDay} onChange={(e) => set("cycleDay", e.target.value)} aria-invalid={bad} aria-describedby="usage-plan-err" className={input} />
        </label>
        <label className={fieldLabel}>
          {t("usage.plan.fx")}
          <input type="number" min={3} max={6} step="0.01" inputMode="decimal" value={v.fx} onChange={(e) => set("fx", e.target.value)} aria-invalid={bad} aria-describedby="usage-plan-err" className={input} />
        </label>
        <label className={fieldLabel}>
          {t("usage.plan.domain")}
          <input type="number" min={0} step={1} inputMode="decimal" value={v.domain} onChange={(e) => set("domain", e.target.value)} aria-invalid={bad} aria-describedby="usage-plan-err" className={input} />
        </label>
        <button type="submit" disabled={saving} className={primaryBtn}>{t("usage.plan.save")}</button>
      </form>
      <p id="usage-plan-err" role={bad ? "alert" : undefined} className={`text-[13px] font-semibold text-adm-danger ${bad ? "" : "hidden"}`}>{bad ? t("usage.plan.bad") : ""}</p>
      <p className={hint}>{t("usage.plan.checked", { date: fmtLongDate(s.prices_checked_on, locale) })}</p>
    </section>
  );
}
