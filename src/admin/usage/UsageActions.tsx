"use client";
// Tindakan disyorkan (PRD usage §7.3): ordered crit → warn → info, each with a text level pill.
import { useT } from "../i18n";
import { fmtBytes, fmtPct, fmtValue } from "./format";
import type { MetricKey, UsageAction, UsageModel } from "./model";
import type { UsageReport } from "./types";
import { card, h2, hint, pill, solid, type Tone } from "./ui";

export function UsageActions({ u, r }: { u: UsageModel; r: UsageReport }) {
  const { t, locale } = useT();
  const s = r.settings;
  const P = s.limits.pro;

  const text = (a: UsageAction): { title: string; body: string } => {
    if (a.code.startsWith("fix:")) {
      const key = a.code.slice(4) as MetricKey;
      const m = u.metrics.find((x) => x.key === key);
      const quota = key === "egress" ? fmtBytes(P.egress_bytes, locale) : key === "cached" ? fmtBytes(P.cached_egress_bytes, locale)
        : key === "db" ? fmtBytes(P.db_bytes, locale) : key === "storage" ? fmtBytes(P.storage_bytes, locale) : "";
      const usd = key.startsWith("email") ? s.prices.resend_pro_usd : s.prices.supabase_pro_usd;
      const base = t(`usage.actions.fix.${key}.t`, { limit: m ? fmtValue(m.limit, m.unit, locale) : "" });
      return {
        title: t("usage.actions.numbers", { title: base, used: fmtPct(a.usedPct ?? 0, locale), proj: fmtPct(a.projPct ?? 0, locale) }),
        body: t(`usage.actions.fix.${key}.d`, { usd, quota }),
      };
    }
    switch (a.code) {
      case "backup":
        return { title: t("usage.actions.backup.t", { n: (a.orgs ?? 0).toLocaleString(locale) }), body: t("usage.actions.backup.d") };
      case "calibrate":
        return { title: t("usage.actions.calibrate.t"), body: a.days == null ? t("usage.actions.calibrate.never") : t("usage.actions.calibrate.d") };
      case "none":
        return { title: t("usage.actions.none.t"), body: t("usage.actions.none.d", { pct: s.alert_warn_pct }) };
      default:
        return { title: t(`usage.actions.${a.code}.t`), body: t(`usage.actions.${a.code}.d`) };
    }
  };

  return (
    <section aria-labelledby="usage-actions" className={card}>
      <div className="flex flex-col gap-1">
        <h2 id="usage-actions" className={h2}>{t("usage.actions.title")}</h2>
        <p className={hint}>{t("usage.actions.hint")}</p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {u.actions.map((a) => {
          const tone: Tone = a.level;
          const { title, body } = text(a);
          return (
            <li key={a.code} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 rounded-xl bg-adm-ground p-3">
              <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 rounded-full ${solid[tone]}`} />
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${pill[tone]}`}>{t(`usage.level.${a.level}`)}</span>
                  <b className="text-[14px] break-words">{title}</b>
                </div>
                <p className="text-[13px] leading-[1.5] text-adm-muted">{body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
