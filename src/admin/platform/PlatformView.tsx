"use client";
// Platform (PRD Phase 2 §4.3, designs/admin/Admin; computer = table with filters, §5.1).
// Data: platform_org_list() (migration 0003, platform owners only). Decisions: review_org().
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useT } from "../i18n";
import { notify } from "../notify";
import { useAdmin } from "../session";
import { Dialog } from "../shell/Dialog";
import { OrgAvatar } from "../shell/OrgAvatar";
import { useIsDesktop } from "../shell/useIsDesktop";
import { REASON_MAX, TABS, actionsFor, countByTab, filterOrgs, formatBytes, needsReason, reasonError, totals, type PlatformOrg, type PlatformTab, type ReviewAction } from "./logic";

const card = "rounded-[18px] bg-adm-card shadow-[0_1px_3px_rgba(18,38,30,0.08)]";
const badge: Record<PlatformOrg["status"], string> = {
  pending: "bg-[#FFF1D6] text-[#8A5300]",
  rejected: "bg-[#FDECE8] text-adm-danger",
  suspended: "bg-[#FDECE8] text-adm-danger",
  active: "bg-adm-soft text-adm-green-dark",
};

function usePlatformOrgs() {
  const [orgs, setOrgs] = useState<PlatformOrg[] | null>(null);
  const [error, setError] = useState<{ key: string; message?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await getSupabase().rpc("platform_org_list");
    if (e) {
      const missing = e.code === "PGRST202" || /platform_org_list/.test(e.message ?? "") && /not find|does not exist/i.test(e.message ?? "");
      setError(missing ? { key: "platform.needsMigration" } : { key: "platform.loadError", message: e.message });
    } else {
      setError(null);
      setOrgs((data ?? []) as PlatformOrg[]);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { orgs, error, loading, reload: load };
}

export function PlatformView() {
  const a = useAdmin();
  const { t, locale } = useT();
  const desktop = useIsDesktop();
  const { orgs, error, loading, reload } = usePlatformOrgs();
  const [tab, setTab] = useState<PlatformTab>("pending");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [asking, setAsking] = useState<{ org: PlatformOrg; action: ReviewAction } | null>(null);

  const list = useMemo(() => filterOrgs(orgs ?? [], tab, query), [orgs, tab, query]);
  const sum = useMemo(() => totals(orgs ?? []), [orgs]);
  const counts = useMemo(() => countByTab(orgs ?? []), [orgs]);
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });

  const review = async (org: PlatformOrg, action: ReviewAction, reason?: string) => {
    setBusy(org.id);
    setNotice(null);
    const { error: e } = await getSupabase().rpc("review_org", { p_org: org.id, p_action: action, p_reason: reason?.trim() || null });
    setBusy(null);
    if (e) {
      setNotice({ ok: false, text: t("platform.actionError", { message: e.message }) });
      return false;
    }
    setNotice({ ok: true, text: t(`platform.done.${action}`, { name: org.short_name }) });
    if (action === "approve" || action === "reject") notify("reviewed", org.id);
    await reload();
    if (a.orgs.some((o) => o.orgId === org.id)) await a.refresh();
    return true;
  };
  const start = (org: PlatformOrg, action: ReviewAction) => (needsReason(action) ? setAsking({ org, action }) : review(org, action));

  const actionButtons = (o: PlatformOrg, compact = false) =>
    actionsFor(o.status).map((act) => {
      const primary = act === "approve" || act === "reactivate";
      return (
        <button
          key={act}
          type="button"
          disabled={busy === o.id}
          onClick={() => start(o, act)}
          className={`${compact ? "h-10 px-3.5 text-[13px]" : "h-[46px] text-[14px]"} rounded-xl font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-60 ${
            primary ? "bg-adm-green text-white hover:bg-adm-green-dark" : "border-[1.5px] border-adm-line bg-white text-adm-danger hover:bg-[#FDF3F0]"
          }`}
        >
          {t(`platform.action.${act}`)}
        </button>
      );
    });

  const stats = [
    { key: "active", value: String(sum.active), tone: "plain" },
    { key: "pending", value: String(sum.pending), tone: "warn" },
    { key: "screens", value: `${sum.screensOnline}/${sum.screensTotal}`, tone: "plain" },
    { key: "storage", value: formatBytes(sum.storageBytes, locale), tone: "plain" },
  ] as const;

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 lg:hidden">
          <span className="text-[13px] font-bold text-adm-muted">{t("app.name")}</span>
          <h1 className="text-[24px] font-extrabold tracking-[-0.3px]">{t("platform.title")}</h1>
        </div>
        <span className="rounded-full bg-adm-ink px-2.5 py-1.5 text-[12px] font-extrabold text-adm-gold-soft lg:hidden">{t("platform.owner")}</span>
      </div>

      <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        {stats.map((s) => (
          <div key={s.key} className={`flex flex-col-reverse gap-1 rounded-[14px] p-3 lg:p-4 ${s.tone === "warn" ? "bg-[#FFF4DF]" : "bg-white shadow-[0_1px_3px_rgba(18,38,30,0.08)]"}`}>
            <dt className={`text-[12px] ${s.tone === "warn" ? "text-[#6B4A12]" : "text-adm-muted"}`}>{t(`platform.stat.${s.key}`)}</dt>
            <dd className={`text-[22px] font-extrabold ${s.tone === "warn" ? "text-[#8A5300]" : ""}`}>{orgs ? s.value : "–"}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="tablist" aria-label={t("platform.tabs")} className="grid grid-cols-3 rounded-[14px] bg-[#E3ECE7] p-1 lg:w-[460px]">
          {TABS.map((k) => {
            const on = tab === k;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(k)}
                className={`h-10 rounded-[11px] text-[14px] font-bold focus-visible:outline-2 focus-visible:outline-adm-green ${on ? "bg-white text-adm-ink shadow-[0_1px_3px_rgba(18,38,30,0.12)]" : "text-adm-muted"}`}
              >
                {t("platform.tabCount", { label: t(`platform.tab.${k}`), n: counts[k] })}
              </button>
            );
          })}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("platform.search")}
          aria-label={t("platform.search")}
          className="h-11 w-full rounded-xl border border-adm-line bg-white px-4 text-[15px] focus-visible:outline-2 focus-visible:outline-adm-green lg:max-w-[360px]"
        />
        <button type="button" onClick={reload} disabled={loading} className="hidden h-11 rounded-xl px-3 text-[14px] font-bold text-adm-green hover:bg-adm-soft disabled:opacity-60 lg:ml-auto lg:block">
          {t("platform.refresh")}
        </button>
      </div>

      {notice && (
        <p role={notice.ok ? "status" : "alert"} className={`rounded-xl px-3.5 py-3 text-[14px] ${notice.ok ? "bg-adm-soft text-adm-green-dark" : "bg-[#FDECE8] text-adm-danger"}`}>
          {notice.text}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-[#FDECE8] px-3.5 py-3 text-[14px] text-adm-danger">
          {t(error.key, { message: error.message ?? "" })}
        </p>
      )}

      {!orgs && !error ? (
        <p className={`${card} p-5 text-[14px] text-adm-muted`}>{t("app.loading")}</p>
      ) : orgs && list.length === 0 ? (
        <p className={`${card} p-5 text-[14px] text-adm-muted`}>{query.trim() ? t("platform.noMatch") : t(`platform.empty.${tab}`)}</p>
      ) : desktop ? (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[960px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-adm-hair text-[12px] font-bold text-adm-muted">
                {(["masjid", "area", "registrant", "date", "screens", "storage", "actions"] as const).map((c) => (
                  <th key={c} scope="col" className={`px-4 py-3 font-bold ${c === "actions" ? "text-right" : ""}`}>{t(`platform.col.${c}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="border-b border-adm-hair align-top last:border-0">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <OrgAvatar org={{ shortName: o.short_name, logoPath: o.logo_path, accentColor: o.accent_color }} size={36} />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-bold">{o.full_name}</span>
                        <span className="flex items-center gap-2 text-[12px] text-adm-muted">
                          {t(`register.${o.kind}`)}
                          {o.status !== tab && <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${badge[o.status]}`}>{t(`pending.badge.${o.status}`)}</span>}
                        </span>
                        {o.status_reason && o.status !== "active" && (
                          <span className="text-[12px] text-adm-muted">{t("pending.reason", { reason: o.status_reason })}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {o.district}, {o.state}
                    <div className="text-[12px] font-bold text-adm-muted">{o.zone}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="break-all">{o.registrant_email ?? t("platform.unknown")}</div>
                    {o.contact_phone && (
                      <a href={`tel:${o.contact_phone.replace(/[^\d+]/g, "")}`} className="text-[12px] font-bold text-adm-green">
                        {o.contact_phone}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">{date(o.created_at)}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap">{o.screens_online}/{o.screens_total}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap">{formatBytes(o.storage_bytes, locale)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-2">{actionButtons(o, true)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((o) => (
            <li key={o.id} className={`${card} flex flex-col gap-3 p-4`}>
              <div className="flex items-center gap-3">
                <OrgAvatar org={{ shortName: o.short_name, logoPath: o.logo_path, accentColor: o.accent_color }} size={48} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[16px] font-extrabold break-words">{o.full_name}</span>
                  <span className="text-[13px] text-adm-muted">
                    {o.district}, {o.state} · {o.zone}
                  </span>
                </div>
                {o.status !== tab && <span className={`flex-none rounded-full px-2.5 py-1 text-[12px] font-extrabold ${badge[o.status]}`}>{t(`pending.badge.${o.status}`)}</span>}
              </div>
              <dl className="grid grid-cols-[100px_minmax(0,1fr)] gap-y-1.5 text-[13px]">
                <dt className="text-adm-muted">{t("platform.registeredBy")}</dt>
                <dd className="font-semibold break-all">{o.registrant_email ?? t("platform.unknown")}</dd>
                <dt className="text-adm-muted">{t("platform.phone")}</dt>
                <dd className="font-semibold">
                  {o.contact_phone ? (
                    <a href={`tel:${o.contact_phone.replace(/[^\d+]/g, "")}`} className="text-adm-green">
                      {o.contact_phone}
                    </a>
                  ) : (
                    t("platform.unknown")
                  )}
                </dd>
                <dt className="text-adm-muted">{t("platform.date")}</dt>
                <dd className="font-semibold">{date(o.created_at)}</dd>
                {o.address && (
                  <>
                    <dt className="text-adm-muted">{t("platform.address")}</dt>
                    <dd className="font-semibold break-words">{o.address}</dd>
                  </>
                )}
                {o.status !== "pending" && (
                  <>
                    <dt className="text-adm-muted">{t("platform.screens")}</dt>
                    <dd className="font-semibold">{t("platform.screensValue", { online: o.screens_online, total: o.screens_total })}</dd>
                    <dt className="text-adm-muted">{t("platform.storage")}</dt>
                    <dd className="font-semibold">{formatBytes(o.storage_bytes, locale)}</dd>
                  </>
                )}
                {o.status_reason && o.status !== "active" && (
                  <>
                    <dt className="text-adm-muted">{t("platform.reason")}</dt>
                    <dd className="font-semibold break-words">{o.status_reason}</dd>
                  </>
                )}
              </dl>
              <div className={`grid gap-2 ${actionsFor(o.status).length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>{actionButtons(o)}</div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[12px] leading-[1.5] text-adm-muted">{t("platform.tip")}</p>

      {asking && <ReasonDialog key={`${asking.org.id}-${asking.action}`} org={asking.org} action={asking.action} onClose={() => setAsking(null)} onSubmit={(r) => review(asking.org, asking.action, r)} />}
    </div>
  );
}

function ReasonDialog({ org, action, onClose, onSubmit }: { org: PlatformOrg; action: ReviewAction; onClose: () => void; onSubmit: (reason: string) => Promise<boolean> }) {
  const { t } = useT();
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const send = async () => {
    const e = reasonError(action, reason);
    setErr(e);
    if (e) return;
    setSending(true);
    const ok = await onSubmit(reason);
    setSending(false);
    if (ok) onClose();
  };
  return (
    <Dialog open onClose={onClose} title={t(`platform.reasonTitle.${action}`, { name: org.short_name })}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex flex-col gap-3"
      >
        <label htmlFor="platform-reason" className="text-[13px] font-bold text-[#3A4E45]">{t("platform.reasonLabel")}</label>
        <textarea
          id="platform-reason"
          autoFocus
          rows={4}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (err) setErr(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
          }}
          placeholder={t("platform.reasonPlaceholder")}
          aria-invalid={Boolean(err)}
          aria-describedby="platform-reason-help"
          className={`w-full resize-none rounded-[14px] border bg-white px-4 py-3 text-[16px] focus-visible:outline-2 focus-visible:outline-adm-green ${err ? "border-adm-danger" : "border-adm-line"}`}
        />
        <p id="platform-reason-help" className={`text-[12px] ${err ? "font-semibold text-adm-danger" : "text-adm-muted"}`}>{err ? t(err) : t("platform.reasonHint")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-[46px] rounded-xl border-[1.5px] border-adm-line bg-white text-[14px] font-bold focus-visible:outline-2 focus-visible:outline-adm-green">
            {t("platform.cancel")}
          </button>
          <button type="submit" disabled={sending} className="h-[46px] rounded-xl bg-adm-danger text-[14px] font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-60">
            {t(`platform.action.${action}`)}
          </button>
        </div>
      </form>
    </Dialog>
  );
}