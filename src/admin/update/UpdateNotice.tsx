"use client";
// The update notice at the top of every admin page (./logic). Reads public/version.json (what is
// live) and this masjid's screens; shown only when something is behind, dismissible (per browser)
// until something new falls behind.
import { useCallback, useEffect, useState } from "react";
import { RELEASE, VERSION_URL, parseLiveVersion, type LiveVersion } from "@/config/release";
import { getSupabase } from "@/lib/supabase";
import { useT } from "../i18n";
import { useAdmin } from "../session";
import { ICON, Icon } from "../shell/icons";
import { DISMISS_KEY, howKey, updateNotice, type ScreenVersionRow } from "./logic";

const ADMIN_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
const REFRESH_MS = 10 * 60_000;

/** This masjid's screens with their versions (view_mode once migration 0010 is in). */
async function loadScreens(orgId: string): Promise<ScreenVersionRow[]> {
  const sb = getSupabase();
  const full = await sb.from("screens").select("id, name, app_version, view_mode, last_seen_at, revoked_at").eq("org_id", orgId);
  if (!full.error) return (full.data ?? []) as ScreenVersionRow[];
  const basic = await sb.from("screens").select("id, name, app_version, last_seen_at, revoked_at").eq("org_id", orgId);
  return (basic.data ?? []) as ScreenVersionRow[];
}

export function guideHref(lang: string) {
  return `${lang === "en" ? "/en/panduan/" : "/panduan/"}#kemas-kini`;
}

export function UpdateNotice() {
  const a = useAdmin();
  const { t, lang } = useT();
  const orgId = a.current?.orgId ?? null;
  const [live, setLive] = useState<LiveVersion | null>(null);
  const [rows, setRows] = useState<ScreenVersionRow[]>([]);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    setNow(Date.now());
    fetch(VERSION_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => setLive(parseLiveVersion(raw)))
      .catch(() => undefined);
    if (orgId) setRows(await loadScreens(orgId).catch(() => []));
  }, [orgId]);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY));
    } catch {}
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const notice = updateNotice({ releaseId: RELEASE.id, minTvBuild: RELEASE.minTvBuild, adminVersion: ADMIN_VERSION, live, rows, now });
  if (!notice || notice.key === dismissed) return null;
  const dismiss = () => {
    setDismissed(notice.key);
    try {
      localStorage.setItem(DISMISS_KEY, notice.key);
    } catch {}
  };

  return (
    <section aria-labelledby="update-title" className="flex gap-3 rounded-[16px] border border-[#F0D9A8] bg-[#FFF6E0] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4A3A12]">
      <Icon d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6Z M10 19a2 2 0 0 0 4 0" size={22} className="mt-0.5 flex-none text-[#9A6A00]" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 id="update-title" className="text-[15px] font-extrabold">
          {t("update.title")}
        </h2>
        <p>{t("update.whatsNew")}</p>
        {notice.admin && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span>{t("update.adminOutdated")}</span>
            <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-xl bg-[#9A6A00] px-4 text-[14px] font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A6A00]">
              {t("update.reload")}
            </button>
          </div>
        )}
        {notice.screens.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="font-bold">{t("update.screensBehind", { n: notice.screens.length })}</p>
            <ul className="flex flex-col gap-1.5">
              {notice.screens.map((s) => (
                <li key={s.id} className="rounded-xl bg-white/70 px-3 py-2">
                  <b>{s.name}</b> · {t(howKey(s.view_mode))}
                </li>
              ))}
            </ul>
            <a href={guideHref(lang)} target="_blank" rel="noopener" className="flex min-h-11 items-center self-start font-bold text-[#7A5200] underline underline-offset-2">
              {t("update.guide")}
            </a>
          </div>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label={t("update.dismiss")} className="-mt-1.5 -mr-2 flex h-11 w-11 flex-none items-center justify-center rounded-full hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-[#9A6A00]">
        <Icon d={ICON.close} size={18} />
      </button>
    </section>
  );
}
