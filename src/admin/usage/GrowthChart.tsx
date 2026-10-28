"use client";
// Pertumbuhan (PRD usage §7.3): weekly active masjids, last 12 weeks + dashed 12-week projection.
// Inline SVG, no chart library.
import { useT } from "../i18n";
import { card, h2, hint } from "./ui";

const W = 520;
const H = 230;
const L = 34;
const R = 10;
const T = 18;
const B = 28;
const AHEAD = 12;

export function GrowthChart({ weekly, perWeek }: { weekly: number[]; perWeek: number }) {
  const { t, locale } = useT();
  const enough = weekly.length >= 2;
  const last = weekly[weekly.length - 1] ?? 0;
  const future = Array.from({ length: AHEAD }, (_, i) => Math.max(0, last + perWeek * (i + 1)));
  const max = Math.ceil(Math.max(10, ...weekly, ...future) / 10) * 10;
  const span = weekly.length + AHEAD - 1;
  const x = (i: number) => L + ((W - L - R) * i) / span;
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const pts = weekly.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const endX = x(weekly.length - 1);
  const fmt1 = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: 1 });

  return (
    <section aria-labelledby="usage-growth" className={card}>
      <div className="flex flex-col gap-1">
        <h2 id="usage-growth" className={h2}>{t("usage.growth.title")}</h2>
        <p className={hint}>{t("usage.growth.hint")}</p>
      </div>
      {!enough ? (
        <p className="rounded-xl bg-adm-ground px-4 py-10 text-center text-[14px] font-semibold text-adm-muted">{t("usage.growth.notEnough")}</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("usage.growth.aria", { now: Math.round(last), perWeek: fmt1(perWeek) })} className="h-auto w-full text-[11px]">
            {[0, 1, 2, 3, 4].map((k) => {
              const v = (max * k) / 4;
              return (
                <g key={k}>
                  <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#E6EEEA" />
                  <text x={L - 6} y={y(v) + 4} textAnchor="end" className="fill-adm-muted">{v}</text>
                </g>
              );
            })}
            <polygon points={`${x(0)},${y(0)} ${pts} ${endX},${y(0)}`} fill="#146C4A" fillOpacity={0.1} />
            <polyline points={pts} fill="none" stroke="#146C4A" strokeWidth={2.5} strokeLinejoin="round" />
            {perWeek > 0 && (
              <polyline
                points={`${endX},${y(last)} ${future.map((v, i) => `${x(weekly.length + i)},${y(v)}`).join(" ")}`}
                fill="none"
                stroke="#146C4A"
                strokeWidth={2}
                strokeDasharray="5 4"
              />
            )}
            <line x1={endX} x2={endX} y1={T} y2={H - B} stroke="#C9D8D0" strokeDasharray="2 3" />
            <circle cx={endX} cy={y(last)} r={4.5} fill="#146C4A" stroke="#fff" strokeWidth={2} />
            <text x={endX} y={y(last) - 10} textAnchor="middle" className="fill-adm-ink font-bold">{Math.round(last)}</text>
            <text x={x(0)} y={H - 8} className="fill-adm-muted">{t("usage.growth.ago", { n: weekly.length })}</text>
            <text x={endX} y={H - 8} textAnchor="middle" className="fill-adm-muted">{t("usage.growth.now")}</text>
            <text x={W - R} y={H - 8} textAnchor="end" className="fill-adm-muted">{t("usage.growth.ahead")}</text>
          </svg>
          <p className={hint}>
            {perWeek > 0 ? t("usage.growth.note", { perWeek: fmt1(perWeek), n: Math.round(future[AHEAD - 1]).toLocaleString(locale) }) : t("usage.growth.flat")}
          </p>
        </>
      )}
    </section>
  );
}
