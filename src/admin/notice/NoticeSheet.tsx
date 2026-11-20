"use client";
// Tangguh / Batal sheet (PRD enhancements §3.2–3.3): new date + time (or "akan dimaklumkan"), reason
// with quick chips, a live preview drawn by the TV's own theme code, then Sahkan. Batal that would end
// the slide earlier than now asks first. Used by the Kandungan menu and the editor top bar.
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatTime } from "@/core";
import { getSupabase } from "@/lib/supabase";
import {
  REASON_CHIPS, REASON_MAX, applyNotice, noticeEndsAt, noticeInputOf, noticeOf, validateNotice, withdrawNotice,
  type NoticeErrors, type NoticeInput, type NoticeKind, type NoticeRow, type SlideView, type TemplateKey,
} from "@/templates";
import { shortDate } from "../content/logic";
import { PreviewStage } from "../editor/PreviewStage";
import { usePreviewSetup } from "../editor/usePreviewSetup";
import { useClock } from "../home/useHomeData";
import { usePrayerToday } from "../home/usePrayerToday";
import { useT } from "../i18n";
import { useAdmin } from "../session";
import { Dialog } from "../shell/Dialog";
import type { ToastKind } from "../shell/Toast";
import { loadNoticeSlide, noticeSaveError, saveNoticeSlide, type NoticeSlide } from "./save";

type Toast = (kind: ToastKind, text: string) => void;

const label = "text-[13px] font-bold text-[#3A4E45]";
const box = "w-full min-w-0 rounded-xl border bg-white px-3 text-[16px] text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-green";
const btn = "flex h-11 items-center rounded-xl border-[1.5px] px-4 text-[14px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-50";

/** Tangguhkan… / Batalkan…, or Kemas kini notis / Tarik balik notis when a notice exists. */
export function NoticeButtons({ fields, onOpen, onWithdraw }: { fields: Record<string, unknown>; onOpen: (k: NoticeKind) => void; onWithdraw: () => void }) {
  const { t } = useT();
  const n = noticeOf(fields);
  if (n) {
    return (
      <>
        <button type="button" onClick={() => onOpen(n.kind)} className={`${btn} border-[#B45309] bg-white text-[#8A3F06]`}>{t("notice.update")}</button>
        <button type="button" onClick={onWithdraw} className={`${btn} border-adm-line bg-white text-adm-ink`}>{t("notice.withdraw")}</button>
      </>
    );
  }
  return (
    <>
      <button type="button" onClick={() => onOpen("tangguh")} className={`${btn} border-[#B45309] bg-white text-[#8A3F06]`}>{t("notice.postpone")}</button>
      <button type="button" onClick={() => onOpen("batal")} className={`${btn} border-[#B91C1C] bg-white text-[#991B1B]`}>{t("notice.cancelActivity")}</button>
    </>
  );
}

/** Tarik balik notis: removes the notice, restores the priority, keeps ends_at (§3.2). */
export function useWithdrawNotice(toast: Toast, onApplied: (r: NoticeRow) => void) {
  const a = useAdmin();
  const { t } = useT();
  const orgId = a.current!.orgId;
  return useCallback(
    async (slideId: string) => {
      const sb = getSupabase();
      try {
        const cur = await loadNoticeSlide(sb, orgId, slideId);
        const next = withdrawNotice(cur.row);
        await saveNoticeSlide(sb, orgId, slideId, next);
        onApplied(next);
        toast("warn", t("notice.withdrawn"));
      } catch (e) {
        const err = noticeSaveError(e);
        toast("error", t(err.key, { message: err.message }));
      }
    },
    [orgId, onApplied, t, toast],
  );
}

export function NoticeSheet({ kind, slideId, templateKey, fields, status, onClose, onApplied, toast }: {
  kind: NoticeKind;
  slideId: string;
  templateKey: TemplateKey;
  /** Fields to preview with (the editor's current form, or the row in Kandungan). */
  fields: Record<string, unknown>;
  status: string;
  onClose: () => void;
  onApplied: (r: NoticeRow) => void;
  toast: Toast;
}) {
  const a = useAdmin();
  const { t, lang } = useT();
  const org = a.current!;
  const now = useClock(30_000);
  const { ctx, targets } = usePreviewSetup(org);
  const { day } = usePrayerToday(org.zone, now);
  const start = useMemo(() => noticeInputOf(fields, kind), [fields, kind]);
  const [date, setDate] = useState(start.input.newAt?.slice(0, 10) ?? "");
  const [time, setTime] = useState(start.input.newAt?.slice(11, 16) ?? "");
  const [tba, setTba] = useState(start.tba);
  const [reason, setReason] = useState(start.input.reason);
  const [keepEnd, setKeepEnd] = useState(false);
  const [errors, setErrors] = useState<NoticeErrors>({});
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<NoticeSlide | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadNoticeSlide(getSupabase(), org.orgId, slideId).then(setCurrent, (e) => setLoadError((e as { message?: string })?.message ?? String(e)));
  }, [org.orgId, slideId]);

  const input: NoticeInput = { kind, newAt: kind === "tangguh" && !tba && date && time ? `${date}T${time}` : null, reason };
  const reasonLen = [...reason.trim()].length;

  // Once shown, errors clear as soon as they are fixed.
  useEffect(() => {
    setErrors((prev) => (Object.keys(prev).length ? validateNotice(input, tba, Date.now()) : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, time, tba, reason]);

  const result = current ? applyNotice(current.row, input, now, { keepEnd }) : null;
  const shortens = current && kind === "batal"
    ? noticeEndsAt({ kind, newAtMs: null, eventDateIso: typeof current.row.fields.dateIso === "string" ? current.row.fields.dateIso : null, currentEndsAt: current.row.endsAt, now })
    : null;
  const when = (ms: number) => `${shortDate(new Date(ms).toISOString(), lang)} · ${formatTime(ms, true)}`;

  const preview = useMemo<SlideView>(() => {
    const ok = !validateNotice(input, tba, now).newAt;
    const f = { ...fields, notice: { kind, newAt: ok ? input.newAt : null, reason: reason.trim() || null } };
    return { kind: "template", template: templateKey, fields: f } as unknown as SlideView;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, kind, date, time, tba, reason, templateKey, now]);

  const confirm = async () => {
    const e = validateNotice(input, tba, Date.now());
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const sb = getSupabase();
    try {
      const fresh = await loadNoticeSlide(sb, org.orgId, slideId);
      const next = applyNotice(fresh.row, input, Date.now(), { keepEnd });
      await saveNoticeSlide(sb, org.orgId, slideId, next);
      onApplied(next);
      toast("ok", t(kind === "tangguh" ? "notice.savedTangguh" : "notice.savedBatal"));
      onClose();
    } catch (err) {
      const x = noticeSaveError(err);
      toast("error", t(x.key, { message: x.message }));
    } finally {
      setBusy(false);
    }
  };

  const err = (k: keyof NoticeErrors) => {
    const code = errors[k];
    if (!code) return null;
    return <p role="alert" className="text-[13px] font-semibold text-adm-danger">{t(`notice.err.${k}.${code}`, { max: REASON_MAX, n: reasonLen })}</p>;
  };

  return (
    <Dialog open onClose={() => !busy && onClose()} title={t(kind === "tangguh" ? "notice.titleTangguh" : "notice.titleBatal")}>
      <div className="flex flex-col gap-4">
        {(status === "paused" || status === "draft") && (
          <p className="rounded-xl bg-[#FFF4DF] px-3.5 py-3 text-[13px] leading-[1.5] text-[#6B4A12]">{t(status === "paused" ? "notice.pausedHint" : "notice.draftHint")}</p>
        )}
        {loadError && <p role="alert" className="rounded-xl bg-[#FDECE8] px-3.5 py-3 text-[13px] text-adm-danger">{t("notice.err.load", { message: loadError })}</p>}

        {kind === "tangguh" && (
          <fieldset className="flex flex-col gap-2">
            <legend className={`${label} mb-1.5`}>{t("notice.newDate")}</legend>
            {!tba && (
              <div className="grid grid-cols-2 gap-2">
                <input type="date" aria-label={t("notice.newDate")} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.newAt)} className={`${box} h-12 ${errors.newAt ? "border-adm-danger" : "border-adm-line"}`} />
                <input type="time" aria-label={t("notice.newTime")} value={time} onChange={(e) => setTime(e.target.value)} aria-invalid={Boolean(errors.newAt)} className={`${box} h-12 ${errors.newAt ? "border-adm-danger" : "border-adm-line"}`} />
              </div>
            )}
            <label className="flex min-h-11 items-center gap-3 text-[15px]">
              <input type="checkbox" checked={tba} onChange={(e) => setTba(e.target.checked)} className="h-5 w-5 accent-[#146C4A]" />
              {t("notice.tba")}
            </label>
            {err("newAt")}
          </fieldset>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notice-reason" className={label}>{t("notice.reason")}</label>
          <input id="notice-reason" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(errors.reason)} aria-describedby="notice-reason-count" className={`${box} h-12 ${errors.reason ? "border-adm-danger" : "border-adm-line"}`} />
          <span id="notice-reason-count" className={`self-end text-[11px] ${reasonLen > REASON_MAX ? "font-bold text-adm-danger" : "text-adm-muted"}`}>{reasonLen}/{REASON_MAX}</span>
          {err("reason")}
          <div className="flex flex-wrap gap-2">
            {REASON_CHIPS.map((c) => (
              <button key={c} type="button" onClick={() => setReason(c)} aria-pressed={reason === c} className={`min-h-10 rounded-full border px-3 text-[13px] font-semibold ${reason === c ? "border-adm-green bg-adm-soft text-adm-green-dark" : "border-adm-line bg-white"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {shortens?.shortens && (
          <fieldset className="flex flex-col gap-1.5 rounded-xl border border-adm-hair p-3">
            <legend className="px-1 text-[14px] font-bold">{t("notice.shortenQ")}</legend>
            <label className="flex min-h-11 items-center gap-3 text-[14px]">
              <input type="radio" name="notice-end" checked={!keepEnd} onChange={() => setKeepEnd(false)} className="h-5 w-5 accent-[#146C4A]" />
              {t("notice.shortenYes", { date: when(shortens.endsAt!) })}
            </label>
            <label className="flex min-h-11 items-center gap-3 text-[14px]">
              <input type="radio" name="notice-end" checked={keepEnd} onChange={() => setKeepEnd(true)} className="h-5 w-5 accent-[#146C4A]" />
              {current?.row.endsAt === null || current?.row.endsAt === undefined ? t("notice.shortenNoForever") : t("notice.shortenNo", { date: when(current.row.endsAt) })}
            </label>
          </fieldset>
        )}

        <div className="flex flex-col gap-1.5">
          <span className={label}>{t("notice.preview")}</span>
          {ctx && day?.status === "ok" && targets[0] ? (
            <PreviewStage slide={preview} target={targets[0]} day={day} now={now} ctx={ctx} label={t("notice.preview")} />
          ) : (
            <p className="rounded-xl bg-adm-ground px-4 py-6 text-center text-[13px] text-adm-muted">{t("editor.loadingPreview")}</p>
          )}
          {result && <span className="text-[12px] text-adm-muted">{result.endsAt === null ? t("notice.endsNever") : t("notice.endsAt", { date: when(result.endsAt) })}</span>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={onClose} className="h-[46px] rounded-xl border-[1.5px] border-adm-line bg-white text-[14px] font-bold">
            {t("notice.close")}
          </button>
          <button type="button" disabled={busy || !current} onClick={confirm} className="h-[46px] rounded-xl bg-adm-green text-[14px] font-bold text-white hover:bg-adm-green-dark disabled:opacity-60">
            {busy ? t("editor.saving") : t("notice.confirm")}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
