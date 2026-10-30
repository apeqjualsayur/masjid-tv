"use client";
// Maklum balas: a message box that sends feedback to the platform owner (send_feedback, migration
// 0010), and the list of what this account sent before (only its own rows are readable).
import { useCallback, useEffect, useId, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useT } from "../i18n";
import { useAdmin } from "../session";
import { useToasts } from "../shell/Toast";
import { FEEDBACK_MAX, feedbackError, sendErrorKey, type FeedbackRow } from "./logic";

const card = "rounded-[18px] bg-adm-card shadow-[0_1px_3px_rgba(18,38,30,0.08)]";

export function FeedbackView() {
  const a = useAdmin();
  const { t, locale } = useT();
  const { toast, node: toasts } = useToasts();
  const id = useId();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<FeedbackRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: e } = await getSupabase().from("feedback").select("id, message, created_at").order("created_at", { ascending: false }).limit(50);
    if (e) setLoadError(e.message);
    else {
      setLoadError(null);
      setSent((data ?? []) as FeedbackRow[]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    const bad = feedbackError(message);
    setError(bad);
    if (bad || busy) return;
    setBusy(true);
    const { error: e } = await getSupabase().rpc("send_feedback", {
      p_org: a.current?.orgId ?? null,
      p_message: message.trim(),
      p_page: typeof window === "undefined" ? null : window.location.pathname,
      p_app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
    });
    setBusy(false);
    const key = sendErrorKey(e);
    if (key) return setError(key);
    setMessage("");
    toast("ok", t("feedback.sent"));
    load();
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString(locale, { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  const length = [...message].length;

  return (
    <>
      <h1 className="text-[26px] font-extrabold tracking-[-0.3px] lg:hidden">{t("feedback.title")}</h1>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className={`${card} flex flex-col gap-3 p-4 lg:max-w-[720px] lg:p-5`}
      >
        <p className="text-[14px] leading-[1.55] text-adm-muted">{t("feedback.intro")}</p>
        <label htmlFor={`${id}-msg`} className="text-[13px] font-bold text-[#3A4E45]">
          {t("feedback.label")}
        </label>
        <textarea
          id={`${id}-msg`}
          value={message}
          rows={6}
          maxLength={FEEDBACK_MAX}
          onChange={(e) => {
            setMessage(e.target.value);
            if (error) setError(null);
          }}
          placeholder={t("feedback.placeholder")}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-help`}
          className={`w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-[16px] leading-[1.5] text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-green ${error ? "border-adm-danger" : "border-adm-line"}`}
        />
        <div id={`${id}-help`} className="flex items-start justify-between gap-3 text-[12px]">
          {error ? (
            <p role="alert" className="text-[13px] font-semibold text-adm-danger">
              {t(error)}
            </p>
          ) : (
            <span className="text-adm-muted">{t("feedback.hint")}</span>
          )}
          <span className="flex-none text-adm-muted">{t("feedback.count", { n: length, max: FEEDBACK_MAX })}</span>
        </div>
        <button type="submit" disabled={busy} className="h-[52px] rounded-[14px] bg-adm-green px-5 text-[15px] font-bold text-white hover:bg-adm-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-60 lg:self-start">
          {busy ? t("feedback.sending") : t("feedback.send")}
        </button>
      </form>

      <section aria-labelledby={`${id}-sent`} className="flex flex-col gap-2.5 lg:max-w-[720px]">
        <h2 id={`${id}-sent`} className="text-[16px] font-extrabold">
          {t("feedback.sentTitle")}
        </h2>
        {loadError ? (
          <p role="alert" className="rounded-xl bg-[#FDECE8] px-4 py-3 text-[14px] text-adm-danger">
            {t("feedback.loadError", { message: loadError })}
          </p>
        ) : !sent ? (
          <p className={`${card} p-4 text-[14px] text-adm-muted`}>{t("app.loading")}</p>
        ) : sent.length === 0 ? (
          <p className={`${card} p-4 text-[14px] text-adm-muted`}>{t("feedback.none")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sent.map((f) => (
              <li key={f.id} className={`${card} flex flex-col gap-1.5 p-4`}>
                <span className="text-[12px] font-bold text-adm-muted">{fmt(f.created_at)}</span>
                <p className="text-[15px] leading-[1.5] break-words whitespace-pre-wrap">{f.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      {toasts}
    </>
  );
}
