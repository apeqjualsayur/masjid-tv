"use client";
// Platform → Maklum balas: every feedback, newest first, with the masjid and the sender's e-mail
// (platform_feedback, platform owners only). Read only: there are no replies.
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useT } from "../i18n";
import type { PlatformFeedbackRow } from "./logic";

const card = "rounded-[18px] bg-adm-card shadow-[0_1px_3px_rgba(18,38,30,0.08)]";

export function PlatformFeedback() {
  const { t, locale } = useT();
  const [rows, setRows] = useState<PlatformFeedbackRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await getSupabase().rpc("platform_feedback");
    setLoading(false);
    if (e) setError(e.message);
    else {
      setError(null);
      setRows((data ?? []) as PlatformFeedbackRow[]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const fmt = (iso: string) => new Date(iso).toLocaleString(locale, { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <section aria-labelledby="pf-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="pf-title" className="text-[17px] font-extrabold">
          {rows ? t("platformFeedback.title", { n: rows.length }) : t("platform.tab.feedback")}
        </h2>
        <button type="button" onClick={load} disabled={loading} className="h-11 rounded-xl px-3 text-[14px] font-bold text-adm-green hover:bg-adm-soft disabled:opacity-60">
          {t("platform.refresh")}
        </button>
      </div>
      {error ? (
        <p role="alert" className="rounded-xl bg-[#FDECE8] px-3.5 py-3 text-[14px] text-adm-danger">
          {t("platformFeedback.error", { message: error })}
        </p>
      ) : !rows ? (
        <p className={`${card} p-5 text-[14px] text-adm-muted`}>{t("app.loading")}</p>
      ) : rows.length === 0 ? (
        <p className={`${card} p-5 text-[14px] text-adm-muted`}>{t("platformFeedback.empty")}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((f) => (
            <li key={f.id} className={`${card} flex flex-col gap-2 p-4`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-[15px] font-extrabold">{f.org_name ?? t("platformFeedback.noOrg")}</span>
                <span className="text-[12px] text-adm-muted">{fmt(f.created_at)}</span>
              </div>
              <span className="text-[13px] break-all text-adm-muted">{f.sender_email ?? "–"}</span>
              <p className="text-[15px] leading-[1.55] break-words whitespace-pre-wrap">{f.message}</p>
              {(f.page || f.app_version) && <span className="text-[12px] text-adm-muted">{[f.page, f.app_version].filter(Boolean).join(" · ")}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
