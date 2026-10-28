"use client";
// Kos bulanan jika berkembang (PRD usage §7.4). Scrolls inside its card on a phone.
import { useT } from "../i18n";
import { fmtBytes } from "./format";
import type { ScaleRow } from "./model";
import { card, h2, hint } from "./ui";

const COLS = ["masjid", "tv", "egress", "storage", "supabase", "resend", "rm"] as const;
const numeric = new Set<string>(["masjid", "tv", "egress", "storage", "rm"]);

export function ScaleTable({ rows }: { rows: ScaleRow[] }) {
  const { t, locale } = useT();
  const n = (v: number) => v.toLocaleString(locale);
  const supa = (z: ScaleRow) => (z.plan === "free" ? t("usage.scale.free") : z.compute === "micro" ? t("usage.scale.pro") : t("usage.scale.proCompute", { compute: z.compute }));
  const cell = (c: (typeof COLS)[number]) => `px-2.5 py-2.5 whitespace-nowrap ${numeric.has(c) ? "text-right tabular-nums" : "text-left"}`;
  return (
    <section aria-labelledby="usage-scale" className={card}>
      <div className="flex flex-col gap-1">
        <h2 id="usage-scale" className={h2}>{t("usage.scale.title")}</h2>
        <p className={hint}>{t("usage.scale.hint")}</p>
      </div>
      <div className="-mx-1 overflow-x-auto px-1" tabIndex={0} role="region" aria-labelledby="usage-scale">
        <table className="w-full min-w-[720px] border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-adm-hair">
              {COLS.map((c) => (
                <th key={c} scope="col" className={`${cell(c)} text-[11px] font-extrabold tracking-[0.07em] text-adm-muted uppercase`}>{t(`usage.scale.col.${c}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((z) => (
              <tr key={z.n} className={`border-b border-adm-hair last:border-0 ${z.now ? "bg-[#F1F7F3] font-extrabold" : ""}`}>
                <th scope="row" className={`${cell("masjid")} ${z.now ? "font-extrabold" : "font-normal"}`}>{z.now ? t("usage.scale.now", { n: n(z.n) }) : n(z.n)}</th>
                <td className={cell("tv")}>{n(z.tvs)}</td>
                <td className={cell("egress")}>{fmtBytes(z.egressBytes, locale)}</td>
                <td className={cell("storage")}>{fmtBytes(z.storageBytes, locale)}</td>
                <td className={cell("supabase")}>{supa(z)}</td>
                <td className={cell("resend")}>{z.resendPlan === "pro" ? t("usage.scale.pro") : t("usage.scale.free")}</td>
                <td className={cell("rm")}>{Math.round(z.rm).toLocaleString(locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
