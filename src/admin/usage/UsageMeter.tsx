"use client";
// One limit card (PRD usage §7.2): name, status pill, used / limit / %, bar (solid = used,
// hatched = projected, tick at the warn %), projected, runs out at, around when, source line.
import { useT } from "../i18n";
import { fmtPct, fmtValue } from "./format";
import type { UsageMetric } from "./model";
import type { UsageReport } from "./types";
import { hatch, pill, solid, type Tone } from "./ui";
import { whenText } from "./UsageSummary";

/** Cycle-based meters wait for 2 days of data; database, storage and users are exact from day 1. */
const isFlow = (m: UsageMetric) => !m.stock && m.key !== "mau";

export function UsageMeter({ m, r, collecting, daysOfData, rpsNow }: { m: UsageMetric; r: UsageReport; collecting: boolean; daysOfData: number; rpsNow: number }) {
  const { t, locale } = useT();
  const name = t(`usage.metric.${m.key}`);
  const waiting = collecting && isFlow(m);
  const tone: Tone = waiting ? "grey" : m.level;
  const used = Math.min(100, m.usedPct);
  const proj = Math.min(100, Math.max(m.projPct, m.usedPct));
  const warnAt = r.settings.alert_warn_pct;
  const v = (x: number) => fmtValue(x, m.unit, locale);

  const source = (() => {
    switch (m.key) {
      case "egress":
      case "cached":
        return m.factor != null ? t("usage.source.calibrated", { f: m.factor.toFixed(2) }) : t("usage.source.uncalibrated");
      case "db":
        return t("usage.source.db");
      case "storage":
        return t("usage.source.storage", { n: r.live.storage_objects.toLocaleString(locale) });
      case "rps":
        return t("usage.source.rps", { rps: rpsNow.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), compute: r.settings.compute });
      case "email_day":
        return t("usage.source.emailDay", { n: r.cycle_to_date.emails_today.toLocaleString(locale) });
      case "email_month":
        return t("usage.source.emailMonth");
      default:
        return t("usage.source.mau");
    }
  })();

  const when = whenText(m, t, locale);
  return (
    <article className="relative flex flex-col gap-2 rounded-[14px] border border-adm-hair p-3.5 pl-4">
      <span aria-hidden="true" className={`absolute top-3 bottom-3 left-0 w-[3px] rounded-r-[3px] ${solid[tone]}`} />
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-extrabold">{name}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-extrabold whitespace-nowrap ${pill[tone]}`}>
          {waiting ? t("usage.level.collecting") : t(`usage.level.${m.level}`)}
        </span>
      </div>
      <p className="text-[20px] font-extrabold tracking-[-0.2px] tabular-nums">
        {v(m.used)} <small className="text-[13px] font-medium text-adm-muted">{t("usage.meter.value", { limit: v(m.limit), pct: fmtPct(m.usedPct, locale) })}</small>
      </p>
      <div
        role="img"
        aria-label={waiting ? t("usage.meter.ariaCollecting", { name, used: fmtPct(m.usedPct, locale) }) : t("usage.meter.aria", { name, used: fmtPct(m.usedPct, locale), proj: fmtPct(m.projPct, locale) })}
        className="relative h-2.5 overflow-hidden rounded-full bg-adm-hair"
      >
        {!waiting && <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${proj}%`, backgroundImage: hatch[tone] }} />}
        <span className={`absolute inset-y-0 left-0 rounded-full ${solid[tone]}`} style={{ width: `${used}%` }} />
        <span className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-adm-ink opacity-35" style={{ left: `${warnAt}%` }} />
      </div>
      {waiting ? (
        <p className="text-[13px] font-semibold text-adm-muted">{t("usage.meter.collecting", { day: Math.max(1, daysOfData) })}</p>
      ) : (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-[13px] tabular-nums">
          <dt className="text-adm-muted">{t("usage.meter.projected")}</dt>
          <dd className="text-right font-semibold">{t("usage.meter.projectedValue", { value: v(m.proj), pct: fmtPct(m.projPct, locale) })}</dd>
          <dt className="text-adm-muted">{t("usage.meter.runsOutAt")}</dt>
          <dd className="text-right font-semibold">{m.runsOutAt == null ? t("usage.meter.none") : t("usage.meter.runsOutAtValue", { n: m.runsOutAt.toLocaleString(locale) })}</dd>
          <dt className="text-adm-muted">{t("usage.meter.runsOutWhen")}</dt>
          <dd className="text-right font-semibold">{when ?? t("usage.meter.none")}</dd>
        </dl>
      )}
      <p className="text-[12px] text-adm-muted">{source}</p>
    </article>
  );
}
