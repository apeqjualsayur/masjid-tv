"use client";
// "Pasang app di TV" (PRD enhancements §8.5): version, size and date from /apk/latest.json, the APK
// download (for a USB stick), the short link to type into the TV's Downloader app, the steps, and the
// Fully Kiosk note. Without latest.json (not published yet, offline) the steps still show.
import { useEffect, useState } from "react";
import { APK_LATEST_URL, APK_SHORT_LINK, APK_URL, formatMegabytes, parseLatestApk, type LatestApk } from "@/config/app-shell";
import { useT } from "../i18n";
import { ICON, Icon } from "../shell/icons";

/**
 * /apk/latest.json, loaded once per page. `latest` is null while loading or when unavailable;
 * `published` is false only on a 404 (no app released yet: the card is not shown, so nobody gets a
 * dead download link). Offline or other errors keep the card with its steps.
 */
export function useLatestApk(): { latest: LatestApk | null; published: boolean } {
  const [state, setState] = useState<{ latest: LatestApk | null; published: boolean }>({ latest: null, published: true });
  useEffect(() => {
    let off = false;
    fetch(APK_LATEST_URL, { cache: "no-store" })
      .then(async (r) => {
        if (off) return;
        if (r.status === 404) return setState({ latest: null, published: false });
        setState({ latest: r.ok ? parseLatestApk(await r.json().catch(() => null)) : null, published: true });
      })
      .catch(() => undefined);
    return () => {
      off = true;
    };
  }, []);
  return state;
}

const OPEN_KEY = "mv:install-app-open";
const STEPS = ["step1", "step2", "step3", "step4", "step5"] as const;

function readOpen(): boolean | null {
  try {
    const v = localStorage.getItem(OPEN_KEY);
    return v === null ? null : v === "1";
  } catch {
    return null;
  }
}

/**
 * `remember`: the Skrin page card (open/closed kept per browser, open the first time). In the
 * "Tambah skrin" sheet it starts closed and is not remembered.
 */
export function InstallAppCard({ latest, remember = false }: { latest: LatestApk | null; remember?: boolean }) {
  const { t, locale } = useT();
  const [open, setOpen] = useState(!remember ? false : true);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!remember) return;
    const v = readOpen();
    if (v !== null) setOpen(v);
  }, [remember]);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (remember) {
      try {
        localStorage.setItem(OPEN_KEY, next ? "1" : "0");
      } catch {
        // not remembered this time
      }
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${APK_SHORT_LINK}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };
  const date = latest ? new Date(latest.date).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }) : "";
  const panelId = remember ? "install-app-panel" : "install-app-panel-sheet";

  return (
    <section aria-labelledby={`${panelId}-title`} className={remember ? "rounded-[18px] bg-adm-card shadow-[0_1px_3px_rgba(18,38,30,0.08)]" : "rounded-[14px] border border-adm-hair bg-[#F7FAF8]"}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-[56px] w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-adm-green"
      >
        <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-adm-soft text-adm-green">
          <Icon d={ICON.screens} size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span id={`${panelId}-title`} className="text-[15px] font-extrabold">{remember ? t("screens.app.title") : t("screens.app.sheetTitle")}</span>
          <span className="text-[12px] leading-[1.4] text-adm-muted">{latest ? t("screens.app.version", { version: latest.versionName, size: formatMegabytes(latest.bytes), date }) : t("screens.app.subtitle")}</span>
        </span>
        <Icon d={ICON.chevronDown} size={20} className={`flex-none text-adm-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div id={panelId} className="flex flex-col gap-4 px-4 pb-4">
          <p className="text-[14px] leading-[1.5] text-[#3A4E45]">{t("screens.app.why")}</p>

          <div className="flex flex-col gap-1.5 rounded-xl border border-adm-hair bg-white p-3">
            <span className="text-[12px] font-bold tracking-[0.04em] text-adm-muted uppercase">{t("screens.app.linkLabel")}</span>
            <span className="font-mono text-[20px] font-extrabold break-all text-adm-ink">{APK_SHORT_LINK}</span>
            <div className="mt-1 flex flex-wrap gap-2">
              <button type="button" onClick={copy} className="h-11 rounded-xl border-[1.5px] border-adm-green bg-white px-4 text-[14px] font-bold text-adm-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green">
                {copied ? t("screens.app.copied") : t("screens.app.copy")}
              </button>
              <a href={APK_URL} download className="flex h-11 items-center rounded-xl bg-adm-green px-4 text-[14px] font-bold text-white hover:bg-adm-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green">
                {t("screens.app.download")}
              </a>
            </div>
            <span className="text-[12px] leading-[1.4] text-adm-muted">{t("screens.app.downloadHint")}</span>
            {!latest && <span className="text-[12px] leading-[1.4] text-adm-muted">{t("screens.app.noInfo")}</span>}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-[13px] font-extrabold tracking-[0.06em] text-adm-muted uppercase">{t("screens.app.stepsTitle")}</h3>
            <ol className="flex flex-col gap-2.5">
              {STEPS.map((k, i) => (
                <li key={k} className="flex gap-3 text-[14px] leading-[1.5]">
                  <span aria-hidden="true" className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-adm-soft text-[13px] font-extrabold text-adm-green-dark">{i + 1}</span>
                  <span>{t(`screens.app.${k}`, { link: APK_SHORT_LINK })}</span>
                </li>
              ))}
            </ol>
          </div>

          <p className="rounded-xl bg-adm-ground px-3 py-2.5 text-[13px] leading-[1.45] text-adm-muted">{t("screens.app.kiosk")}</p>
        </div>
      )}
    </section>
  );
}
