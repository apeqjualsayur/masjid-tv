"use client";
// Skrin (PRD Phase 2 §4.4, designs/admin/Screens): list with mini previews and status,
// "Tambah skrin" sheet (code from the TV or ?pair= from its QR) → pair_claim, and per-screen
// rename / theme / layout / revoke / delete.
import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { THEMES_ROUND2_VISIBLE } from "@/config/features";
import { RELEASE, isOutdated } from "@/config/release";
import { getSupabase } from "@/lib/supabase";
import { useDuration } from "../home/HomeView";
import { useClock } from "../home/useHomeData";
import { useT } from "../i18n";
import { useAdmin } from "../session";
import { Dialog } from "../shell/Dialog";
import { ICON, Icon } from "../shell/icons";
import { useToasts } from "../shell/Toast";
import { NAME_MAX, PENDING_PAIR_KEY, POSTER_TIP_KEY, claimErrorKey, codeFromPaste, codeFromQuery, layoutChoices, nameError, onlyDigits, screenStatus, sortScreens, suggestPosterLayout, themeChoices, type Layout, type Screen, type Theme } from "./logic";
import { ThemeThumb } from "./ThemeThumb";

const card = "rounded-[18px] bg-adm-card shadow-[0_1px_3px_rgba(18,38,30,0.08)]";
const fieldLabel = "text-[13px] font-bold text-[#3A4E45]";
const input = "h-12 w-full rounded-xl border border-adm-line bg-white px-3.5 text-[16px] text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-green";
const primary = "h-[52px] w-full rounded-[14px] bg-adm-green text-[15px] font-bold text-white hover:bg-adm-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-60";
const secondary = "h-11 rounded-xl border border-adm-line bg-white px-4 text-[14px] font-bold text-adm-ink hover:bg-adm-ground focus-visible:outline-2 focus-visible:outline-adm-green";

const host = () => (typeof window === "undefined" ? "masjidview.my" : window.location.host);

export function ScreensView() {
  const a = useAdmin();
  const { t } = useT();
  const { toast, node: toasts } = useToasts();
  const orgId = a.current!.orgId;
  const canEdit = true; // every member is a Pentadbir (PRD §3 v0.3)
  const now = useClock(30_000);
  const [screens, setScreens] = useState<Screen[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ code: string } | null>(null);
  const [managing, setManaging] = useState<Screen | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    const cols = "id, name, theme, layout, last_seen_at, revoked_at, app_version, created_at";
    // view_mode exists once migration 0010 has run; until then load without it.
    let res: { data: unknown[] | null; error: { message: string } | null } = await sb.from("screens").select(`${cols}, view_mode`).eq("org_id", orgId);
    if (res.error) res = await sb.from("screens").select(cols).eq("org_id", orgId);
    const { data, error } = res;
    if (error) setLoadError(error.message);
    else {
      setLoadError(null);
      setScreens(sortScreens((data ?? []) as Screen[]));
    }
  }, [orgId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  // QR from the TV: /admin/skrin/?pair=482913 opens the sheet with the code filled in.
  useEffect(() => {
    let code = codeFromQuery(window.location.search);
    try {
      code = code ?? codeFromQuery(`?pair=${sessionStorage.getItem(PENDING_PAIR_KEY) ?? ""}`);
      sessionStorage.removeItem(PENDING_PAIR_KEY);
    } catch {}
    if (code && canEdit) setAdding({ code });
  }, [canEdit]);
  useEffect(() => {
    const open = () => setAdding({ code: "" });
    window.addEventListener("mv:add-screen", open);
    return () => window.removeEventListener("mv:add-screen", open);
  }, []);
  const closeAdd = () => {
    setAdding(null);
    if (codeFromQuery(window.location.search)) window.history.replaceState(null, "", window.location.pathname);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <h1 className="text-[26px] font-extrabold tracking-[-0.3px]">{t("screens.title")}</h1>
        {canEdit && (
          <button type="button" onClick={() => setAdding({ code: "" })} className="h-11 rounded-xl bg-adm-green px-4 text-[14px] font-bold text-white">
            {t("screens.add")}
          </button>
        )}
      </div>
      {loadError && <p role="alert" className="rounded-xl bg-[#FDECE8] px-4 py-3 text-[14px] text-adm-danger">{t("screens.loadError", { message: loadError })}</p>}

      {!screens && !loadError ? (
        <p className={`${card} p-5 text-[14px] text-adm-muted`}>{t("app.loading")}</p>
      ) : screens && screens.length === 0 ? (
        <p className={`${card} p-5 text-[15px] leading-[1.5] text-adm-muted`}>{t("screens.empty", { host: host() })}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
          {(screens ?? []).map((s) => (
            <ScreenCard key={s.id} s={s} now={now} canEdit={canEdit} onManage={() => setManaging(s)} />
          ))}
        </ul>
      )}
      {adding && (
        <AddSheet
          orgId={orgId}
          screens={screens}
          initialCode={adding.code}
          onClose={closeAdd}
          onDone={(name) => {
            closeAdd();
            toast("ok", t("screens.connected", { name }));
            load();
          }}
        />
      )}
      {managing && (
        <ManageSheet
          s={managing}
          onClose={() => setManaging(null)}
          onDone={(text) => {
            setManaging(null);
            toast("ok", text);
            load();
          }}
          onError={(m) => toast("error", t("screens.error", { message: m }))}
        />
      )}
      {toasts}
    </>
  );
}

/** Desktop header button (AdminShell actions). */
export function AddScreenAction() {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("mv:add-screen"))}
      className="h-11 rounded-xl bg-adm-green px-4 text-[14px] font-bold text-white hover:bg-adm-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green"
    >
      {t("screens.add")}
    </button>
  );
}

/** Guide section on full screen (landing /panduan). */
const fullscreenGuide = (lang: string) => `${lang === "en" ? "/en/panduan/" : "/panduan/"}#skrin-penuh`;

function ScreenCard({ s, now, canEdit, onManage }: { s: Screen; now: number; canEdit: boolean; onManage: () => void }) {
  const { t, lang } = useT();
  const dur = useDuration();
  const st = screenStatus(s, now);
  const live = st.kind === "online" || st.kind === "offline";
  const behind = live && isOutdated(s.app_version, RELEASE.minTvBuild);
  const notFull = live && s.view_mode === "window";
  const status =
    st.kind === "online" ? (
      <span className="flex items-center gap-1.5 text-[13px] font-bold text-adm-ok"><span className="h-2 w-2 rounded-full bg-[#1E9E62]" />{t("screens.online")}</span>
    ) : st.kind === "offline" ? (
      <span className="flex items-center gap-1.5 text-[13px] font-bold text-adm-bad"><span className="h-2 w-2 rounded-full bg-[#C2410C]" />{t("screens.offline", { duration: dur(st.forMs, true) })}</span>
    ) : st.kind === "never" ? (
      <span className="flex items-center gap-1.5 text-[13px] font-bold text-adm-muted"><span className="h-2 w-2 rounded-full bg-[#9FB3A9]" />{t("screens.never")}</span>
    ) : (
      <span className="flex items-center gap-1.5 text-[13px] font-bold text-adm-danger"><span className="h-2 w-2 rounded-full bg-adm-danger" />{t("screens.revoked")}</span>
    );
  return (
    <li className={`${card} flex flex-col gap-3 p-3.5 ${st.kind === "revoked" ? "opacity-80" : ""}`}>
      <div className="flex items-center gap-3.5">
        <ThemeThumb theme={s.theme} layout={s.layout} />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="truncate text-[16px] font-extrabold">{s.name}</span>
          {status}
          <span className="text-[12px] text-adm-muted">{t(`theme.${s.theme}`)} · {t(`layout.${s.layout}`)}</span>
        </div>
      </div>
      {(behind || notFull) && (
        <div className="flex flex-wrap gap-1.5">
          {behind && <span className="rounded-full bg-[#FFF1D6] px-2.5 py-1 text-[12px] font-extrabold text-[#7A4700]">{t("screens.needsUpdate")}</span>}
          {notFull && (
            <a href={fullscreenGuide(lang)} target="_blank" rel="noopener" className="rounded-full bg-[#E3ECE7] px-2.5 py-1 text-[12px] font-extrabold text-[#3A4E45] underline-offset-2 hover:underline">
              {t("screens.notFullscreen")}
            </a>
          )}
        </div>
      )}
      {st.kind === "offline" && <p className="rounded-xl bg-[#FFF4DF] px-3 py-2.5 text-[13px] leading-[1.45] text-[#6B4A12]">{t("screens.offlineNote")}</p>}
      {st.kind === "revoked" && <p className="rounded-xl bg-adm-ground px-3 py-2.5 text-[13px] leading-[1.45] text-adm-muted">{t("screens.revokedNote")}</p>}
      {canEdit && (
        <button type="button" onClick={onManage} className={secondary}>
          {t("screens.manage")}
        </button>
      )}
    </li>
  );
}

function CodeBoxes({ value, onChange, invalid, describedBy }: { value: string; onChange: (v: string) => void; invalid: boolean; describedBy?: string }) {
  const { t } = useT();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const focus = (i: number) => refs.current[Math.max(0, Math.min(5, i))]?.focus();
  const setAt = (i: number, digits: string) => {
    const chars = value.padEnd(6, " ").split("");
    for (let k = 0; k < digits.length && i + k < 6; k++) chars[i + k] = digits[k];
    onChange(chars.join("").replace(/ /g, ""));
    focus(i + digits.length);
  };
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i]) {
      e.preventDefault();
      if (i > 0) {
        onChange(value.slice(0, i - 1) + value.slice(i));
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft") focus(i - 1);
    else if (e.key === "ArrowRight") focus(i + 1);
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const code = codeFromPaste(e.clipboardData.getData("text"));
    onChange(code);
    focus(code.length);
  };
  return (
    <div className="grid grid-cols-6 gap-2">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i] ?? ""}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          aria-label={t("screens.digit", { n: i + 1 })}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => onKey(i, e)}
          onPaste={onPaste}
          onChange={(e) => {
            const d = onlyDigits(e.target.value);
            if (!d) {
              onChange(value.slice(0, i) + value.slice(i + 1));
              return;
            }
            // one typed digit, or several from autofill → fill from this box onwards
            setAt(i, d.length > 1 && value[i] && d.startsWith(value[i]) ? d.slice(1) : d);
          }}
          className={`h-[58px] w-full min-w-0 rounded-xl border-[1.5px] bg-[#F7FAF8] text-center text-[26px] font-extrabold text-adm-ink focus-visible:border-adm-green focus-visible:outline-none ${invalid ? "border-adm-danger" : value[i] ? "border-[#9FBBAE]" : "border-[#CFDCD5]"}`}
        />
      ))}
    </div>
  );
}

/** Theme choice: 3 launch themes, or all 7 with round 2 (thumbnails are real, lazy renders). */
function ThemePicker({ value, onChange, layout, current }: { value: Theme; onChange: (t: Theme) => void; layout: Layout; current?: Theme }) {
  const { t } = useT();
  return (
    <div role="radiogroup" aria-label={t("screens.theme")} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {themeChoices(THEMES_ROUND2_VISIBLE, current).map((th) => {
        const on = th === value;
        return (
          <button
            key={th}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(th)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-[1.5px] p-2 text-[13px] font-bold focus-visible:outline-2 focus-visible:outline-adm-green ${on ? "border-adm-green bg-[#F1F8F4] text-adm-ink" : "border-adm-line bg-white text-adm-muted"}`}
          >
            <ThemeThumb theme={th} layout={layout} width={88} />
            {t(`theme.${th}`)}
          </button>
        );
      })}
    </div>
  );
}

/** Layout choice: 3, or 4 with round 2 ("Pengumuman sahaja" carries its helper text). */
function LayoutPicker({ value, onChange, theme, current }: { value: Layout; onChange: (l: Layout) => void; theme: Theme; current?: Layout }) {
  const { t } = useT();
  const choices = layoutChoices(THEMES_ROUND2_VISIBLE, current);
  return (
    <div role="radiogroup" aria-label={t("screens.layout")} className={`grid gap-2 ${choices.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
      {choices.map((l) => {
        const on = l === value;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={on}
            aria-describedby={l === "poster" ? "layout-poster-help" : undefined}
            onClick={() => onChange(l)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-[1.5px] p-2 text-[13px] font-bold focus-visible:outline-2 focus-visible:outline-adm-green ${on ? "border-adm-green bg-[#F1F8F4] text-adm-ink" : "border-adm-line bg-white text-adm-muted"}`}
          >
            <ThemeThumb theme={theme} layout={l} width={88} />
            {t(`layout.${l}`)}
            {l === "poster" && (
              <span id="layout-poster-help" className="text-center text-[12px] leading-[1.35] font-medium text-adm-muted">
                {t("screens.posterHelp")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** "Second TV? Use Pengumuman sahaja": shown when the masjid has exactly one screen; dismissal remembered per browser. */
function PosterTip({ screens, layout, onUse }: { screens: Screen[] | null; layout: Layout; onUse: () => void }) {
  const { t } = useT();
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(POSTER_TIP_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);
  if (layout === "poster" || !suggestPosterLayout(screens, dismissed, THEMES_ROUND2_VISIBLE)) return null;
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(POSTER_TIP_KEY, "1");
    } catch {}
  };
  return (
    <div role="note" className="flex items-start gap-2 rounded-xl bg-adm-soft px-3.5 py-3 text-[13px] leading-[1.5] text-[#1E4A37]">
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <p>{t("screens.posterTip")}</p>
        <button type="button" onClick={onUse} className="min-h-11 rounded-xl border-[1.5px] border-adm-green bg-white px-3.5 text-[13px] font-bold text-adm-green">
          {t("screens.posterTipUse")}
        </button>
      </div>
      <button type="button" onClick={dismiss} aria-label={t("screens.posterTipDismiss")} className="-mt-1 -mr-1.5 flex h-11 w-11 flex-none items-center justify-center rounded-full hover:bg-white/60">
        <Icon d={ICON.close} size={18} />
      </button>
    </div>
  );
}

function AddSheet({ orgId, screens, initialCode, onClose, onDone }: { orgId: string; screens: Screen[] | null; initialCode: string; onClose: () => void; onDone: (name: string) => void }) {
  const { t } = useT();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<Theme>("tenang");
  const [layout, setLayout] = useState<Layout>("full");
  const [error, setError] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    const ne = nameError(name);
    setNameErr(ne);
    if (code.length !== 6) {
      setError("screens.err.codeIncomplete");
      return;
    }
    if (ne) return;
    setBusy(true);
    setError(null);
    const { data, error: e } = await getSupabase().rpc("pair_claim", { p_code: code, p_org: orgId, p_name: name.trim(), p_theme: theme, p_layout: layout });
    setBusy(false);
    const key = claimErrorKey(data, e);
    if (key) setError(key);
    else onDone(name.trim());
  };

  return (
    <Dialog open onClose={onClose} title={t("screens.addTitle")}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <p className="text-[14px] leading-[1.5] text-adm-muted">{t("screens.addIntro", { host: host() })}</p>
        <div className="flex flex-col gap-2">
          <span className={fieldLabel}>{t("screens.code")}</span>
          <CodeBoxes
            value={code}
            onChange={(v) => {
              setCode(v);
              if (error) setError(null);
            }}
            invalid={Boolean(error)}
            describedBy={error ? "add-code-err" : "add-code-hint"}
          />
          {error ? (
            <p id="add-code-err" role="alert" className="text-[13px] font-semibold text-adm-danger">{t(error)}</p>
          ) : (
            <p id="add-code-hint" className="text-[12px] leading-[1.45] text-adm-muted">{t("screens.qrHint")}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="add-name" className={fieldLabel}>{t("screens.name")}</label>
          <input
            id="add-name"
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => {
              setName(e.target.value);
              if (nameErr) setNameErr(null);
            }}
            placeholder={t("screens.namePlaceholder")}
            aria-invalid={Boolean(nameErr)}
            className={input}
          />
          {nameErr && <p className="text-[13px] font-semibold text-adm-danger">{t(nameErr)}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <span className={fieldLabel}>{t("screens.theme")}</span>
          <ThemePicker value={theme} onChange={setTheme} layout={layout} />
        </div>
        <div className="flex flex-col gap-2">
          <span className={fieldLabel}>{t("screens.layout")}</span>
          <PosterTip screens={screens} layout={layout} onUse={() => setLayout("poster")} />
          <LayoutPicker value={layout} onChange={setLayout} theme={theme} />
        </div>
        <button type="submit" disabled={busy} className={primary}>
          {busy ? t("screens.connecting") : t("screens.connect")}
        </button>
      </form>
    </Dialog>
  );
}

function ManageSheet({ s, onClose, onDone, onError }: { s: Screen; onClose: () => void; onDone: (text: string) => void; onError: (m: string) => void }) {
  const { t } = useT();
  const [name, setName] = useState(s.name);
  const [theme, setTheme] = useState<Theme>(s.theme);
  const [layout, setLayout] = useState<Layout>(s.layout);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"revoke" | "delete" | null>(null);
  const revoked = Boolean(s.revoked_at);
  const ne = nameError(name);
  const dirty = name.trim() !== s.name || theme !== s.theme || layout !== s.layout;

  const run = async (op: () => PromiseLike<{ error: { message: string } | null }>, okText: string) => {
    setBusy(true);
    const { error } = await op();
    setBusy(false);
    if (error) onError(error.message);
    else onDone(okText);
  };
  const sb = getSupabase();
  const save = () => run(() => sb.from("screens").update({ name: name.trim(), theme, layout }).eq("id", s.id), t("screens.saved"));
  const revoke = () => run(() => sb.from("screens").update({ revoked_at: new Date().toISOString() }).eq("id", s.id), t("screens.revokedDone", { name: s.name }));
  const remove = () => run(() => sb.from("screens").delete().eq("id", s.id), t("screens.deleted", { name: s.name }));

  if (confirm) {
    const isRevoke = confirm === "revoke";
    return (
      <Dialog open onClose={() => !busy && setConfirm(null)} title={t(isRevoke ? "screens.revokeTitle" : "screens.deleteTitle", { name: s.name })}>
        <p className="mb-5 text-[15px] leading-[1.5]">{t(isRevoke ? "screens.revokeBody" : "screens.deleteBody")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => setConfirm(null)} className="h-[46px] rounded-xl border-[1.5px] border-adm-line bg-white text-[14px] font-bold">
            {t("screens.cancel")}
          </button>
          <button type="button" disabled={busy} onClick={isRevoke ? revoke : remove} className="h-[46px] rounded-xl bg-adm-danger text-[14px] font-bold text-white disabled:opacity-60">
            {t(isRevoke ? "screens.revokeConfirm" : "screens.deleteConfirm")}
          </button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} title={t("screens.manageTitle", { name: s.name })}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!ne && dirty && !busy) save();
        }}
        className="flex flex-col gap-4"
      >
        {!revoked && (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="mng-name" className={fieldLabel}>{t("screens.name")}</label>
              <input id="mng-name" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(ne)} className={input} />
              {ne && <p className="text-[13px] font-semibold text-adm-danger">{t(ne)}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <span className={fieldLabel}>{t("screens.theme")}</span>
              <ThemePicker value={theme} onChange={setTheme} layout={layout} current={s.theme} />
            </div>
            <div className="flex flex-col gap-2">
              <span className={fieldLabel}>{t("screens.layout")}</span>
              <LayoutPicker value={layout} onChange={setLayout} theme={theme} current={s.layout} />
            </div>
            <button type="submit" disabled={busy || !dirty || Boolean(ne)} className={primary}>
              {busy ? t("screens.saving") : t("screens.save")}
            </button>
          </>
        )}
        <div className="flex flex-col gap-2 border-t border-adm-hair pt-4">
          {!revoked && (
            <button type="button" onClick={() => setConfirm("revoke")} className="h-11 rounded-xl border-[1.5px] border-[#E8C9C1] text-[14px] font-bold text-adm-danger">
              {t("screens.revoke")}
            </button>
          )}
          <button type="button" onClick={() => setConfirm("delete")} className="h-11 rounded-xl text-[14px] font-bold text-adm-danger hover:bg-[#FDF3F0]">
            {t("screens.delete")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}