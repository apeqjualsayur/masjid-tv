"use client";
// Tetapan (PRD Phase 2 §4.6, designs/admin/Settings). Both admins of a masjid can change everything.
// Optimistic saves: the screen changes at once; on error it goes back and a toast says why.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FRIDAY_LABEL, localDateKey, waktuName } from "@/core";
import { createFallbackLoader, createPrayerData, idbMonthStore, refreshMonths, type DayResult } from "@/data";
import { getSupabase } from "@/lib/supabase";
import { useT, type Lang } from "../i18n";
import { LIMITS } from "../register/logic";
import { supabaseRegisterBackend } from "../register/backend";
import { compressLogo } from "../register/logo";
import { ROUTES } from "../routing";
import { useAdmin } from "../session";
import { Dialog } from "../shell/Dialog";
import { ICON, Icon } from "../shell/icons";
import { monogram } from "../shell/monogram";
import { useToasts } from "../shell/Toast";
import { ZonePicker } from "../ZonePicker";
import type { ZoneChoice } from "../ZonePicker/logic";
import {
  IQAMAH, IQAMAH_KEYS, JUMAAT_SOLAT, KHUTBAH, SWATCHES, TICKER, changedDurations, cleanTicker, fridayExample, mergeDurations, readDurations, readIqamah, removeLogo,
  replaceLogo, sameLines, stepIqamah, stepJumaatSolat, stepKhutbah, thisFridayKey,
  type Durations, type IqamahMin,
} from "./logic";

const card = "flex flex-col rounded-[18px] bg-adm-card p-4 shadow-[0_1px_3px_rgba(18,38,30,0.08)] lg:p-5";
const h2 = "text-[15px] font-extrabold";
const fieldLabel = "text-[13px] font-bold text-[#3A4E45]";
const input = "h-[46px] w-full rounded-xl border border-adm-line bg-white px-3.5 text-[15px] text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-green disabled:bg-adm-ground disabled:text-adm-muted";
const smallBtn = "h-10 rounded-[10px] border border-adm-line bg-white px-3.5 text-[13px] font-bold text-adm-ink hover:bg-adm-ground focus-visible:outline-2 focus-visible:outline-adm-green disabled:opacity-50";
const primaryBtn = "h-11 rounded-xl bg-adm-green px-4 text-[14px] font-bold text-white hover:bg-adm-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-50";

interface OrgRow {
  kind: "masjid" | "surau";
  full_name: string;
  short_name: string;
  accent_color: string;
  logo_path: string | null;
  zone: string;
  state: string;
  district: string;
}
interface SettingsRow {
  iqamah: IqamahMin;
  durations: Durations;
  clock_24h: boolean;
  show_arabic: boolean;
  ticker: string[];
}

const errText = (e: unknown) => (e as { message?: string })?.message ?? String(e);

export function SettingsView() {
  const a = useAdmin();
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const { toast, node: toasts } = useToasts();
  const orgId = a.current!.orgId;

  const [org, setOrg] = useState<OrgRow | null>(null);
  const [set, setSet] = useState<SettingsRow | null>(null);
  const [members, setMembers] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const savedSet = useRef<SettingsRow | null>(null);

  useEffect(() => {
    let off = false;
    (async () => {
      const sb = getSupabase();
      const [o, s, m] = await Promise.all([
        sb.from("organisations").select("kind, full_name, short_name, accent_color, logo_path, zone, state, district").eq("id", orgId).single(),
        sb.from("org_settings").select("iqamah_min, durations, clock_24h, show_arabic, ticker").eq("org_id", orgId).single(),
        sb.from("members").select("user_id", { count: "exact", head: true }).eq("org_id", orgId),
      ]);
      if (off) return;
      if (o.error || s.error) {
        setLoadError(errText(o.error ?? s.error));
        return;
      }
      setOrg(o.data as OrgRow);
      const row: SettingsRow = {
        iqamah: readIqamah(s.data.iqamah_min),
        durations: readDurations(s.data.durations),
        clock_24h: Boolean(s.data.clock_24h),
        show_arabic: Boolean(s.data.show_arabic),
        ticker: (s.data.ticker as string[] | null) ?? [],
      };
      savedSet.current = row;
      setSet(row);
      setMembers(m.count ?? null);
    })();
    return () => {
      off = true;
    };
  }, [orgId]);

  /** Organisation fields: optimistic, then refresh the session so the header shows the change. */
  const saveOrg = useCallback(
    async (patch: Partial<OrgRow>, okText = t("settings.saved")) => {
      if (!org) return false;
      const before = org;
      setOrg({ ...org, ...patch });
      const { error } = await getSupabase().from("organisations").update(patch).eq("id", orgId);
      if (error) {
        setOrg(before);
        toast("error", t("settings.error", { message: error.message }));
        return false;
      }
      toast("ok", okText);
      a.refresh();
      return true;
    },
    [org, orgId, t, toast, a],
  );

  /** Settings fields: optimistic; steppers are debounced into one save. */
  const pending = useRef<Partial<SettingsRow>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length || !savedSet.current) return;
    const db: Record<string, unknown> = {};
    if (patch.iqamah) db.iqamah_min = patch.iqamah;
    if (patch.durations) {
      // Merge: re-read the row and replace only the keys changed here, so other keys survive.
      const cur = await getSupabase().from("org_settings").select("durations").eq("org_id", orgId).single();
      if (cur.error) {
        setSet((c) => (c ? { ...c, ...pickKeys(savedSet.current!, Object.keys(patch) as (keyof SettingsRow)[]) } : c));
        toast("error", t("settings.error", { message: cur.error.message }));
        return false;
      }
      db.durations = mergeDurations(cur.data.durations, changedDurations(savedSet.current.durations, patch.durations));
    }
    if (patch.clock_24h !== undefined) db.clock_24h = patch.clock_24h;
    if (patch.show_arabic !== undefined) db.show_arabic = patch.show_arabic;
    if (patch.ticker) db.ticker = patch.ticker;
    const { error } = await getSupabase().from("org_settings").update(db).eq("org_id", orgId);
    if (error) {
      setSet((cur) => (cur ? { ...cur, ...pickKeys(savedSet.current!, Object.keys(patch) as (keyof SettingsRow)[]) } : cur));
      toast("error", t("settings.error", { message: error.message }));
      return false;
    }
    savedSet.current = { ...savedSet.current, ...patch };
    toast("ok", t("settings.saved"));
    return true;
  }, [orgId, t, toast]);
  const saveSet = useCallback(
    (patch: Partial<SettingsRow>, debounce = 0) => {
      setSet((cur) => (cur ? { ...cur, ...patch } : cur));
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      if (debounce) {
        timer.current = setTimeout(flush, debounce);
        return Promise.resolve(true);
      }
      return flush();
    },
    [flush],
  );
  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current);
      flush();
    }
  }, [flush]);

  const saveLang = async (l: Lang) => {
    if (l === lang) return;
    setLang(l);
    const { error } = await getSupabase().from("profiles").update({ lang: l }).eq("user_id", a.session!.user.id);
    if (error) toast("error", t("settings.error", { message: error.message }));
  };

  if (loadError) return <p role="alert" className="rounded-xl bg-[#FDECE8] px-4 py-3 text-[14px] text-adm-danger">{t("settings.loadError", { message: loadError })}</p>;
  if (!org || !set) return <p className={`${card} text-[14px] text-adm-muted`}>{t("app.loading")}</p>;

  return (
    <>
      <h1 className="text-[26px] font-extrabold tracking-[-0.3px] lg:hidden">{t("settings.title")}</h1>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:gap-5">
        <div className="flex flex-col gap-4 lg:gap-5">
          <BrandCard org={org} orgId={orgId} saveOrg={saveOrg} toast={toast} onLogo={(p) => setOrg((o) => (o ? { ...o, logo_path: p } : o))} />
          <ZoneCard org={org} saveOrg={saveOrg} />
        </div>
        <div className="flex flex-col gap-4 lg:gap-5">
          <IqamahCard set={set} saveSet={saveSet} />
          <JumaatCard set={set} saveSet={saveSet} zone={org.zone} />
          <DisplayCard set={set} saveSet={saveSet} />
          <section aria-labelledby="set-app" className={`${card} gap-3`}>
            <h2 id="set-app" className={h2}>{t("settings.app")}</h2>
            <div className="flex items-center justify-between gap-3">
              <span id="set-lang" className="text-[15px] font-semibold">{t("settings.language")}</span>
              <Segmented labelledBy="set-lang" value={lang} options={[["ms", t("lang.ms")], ["en", t("settings.langEn")]]} onChange={(v) => saveLang(v as Lang)} />
            </div>
            <Link href={ROUTES.members} className="flex h-12 items-center justify-between border-t border-adm-hair text-[15px] font-semibold text-adm-ink hover:text-adm-green">
              {t("settings.members", { n: members ?? "–" })}
              <Icon d="M9 6l6 6-6 6" size={18} className="text-adm-muted" />
            </Link>
            <button
              type="button"
              onClick={async () => {
                await a.signOut();
                router.replace(ROUTES.signIn);
              }}
              className="flex h-11 items-center border-t border-adm-hair text-[15px] font-bold text-adm-danger"
            >
              {t("account.signOut")}
            </button>
          </section>
        </div>
      </div>
      {toasts}
    </>
  );
}

function pickKeys<T extends object>(o: T, keys: (keyof T)[]): Partial<T> {
  const r: Partial<T> = {};
  for (const k of keys) r[k] = o[k];
  return r;
}

function Segmented({ value, options, onChange, disabled, labelledBy }: { value: string; options: [string, string][]; onChange: (v: string) => void; disabled?: boolean; labelledBy: string }) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex rounded-[10px] bg-[#E3ECE7] p-[3px]">
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(v)}
            className={`h-9 min-w-11 rounded-lg px-3 text-[13px] focus-visible:outline-2 focus-visible:outline-adm-green disabled:cursor-not-allowed ${on ? "bg-white font-extrabold text-adm-ink shadow-[0_1px_2px_rgba(18,38,30,0.12)]" : "font-semibold text-adm-muted"}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function BrandCard({ org, orgId, saveOrg, toast, onLogo }: {
  org: OrgRow; orgId: string;
  saveOrg: (p: Partial<OrgRow>, okText?: string) => Promise<boolean>;
  toast: (k: "ok" | "warn" | "error", text: string) => void;
  onLogo: (path: string | null) => void;
}) {
  const a = useAdmin();
  const { t } = useT();
  const [full, setFull] = useState(org.full_name);
  const [short, setShort] = useState(org.short_name);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const fullLen = [...full.trim()].length;
  const shortLen = [...short.trim()].length;
  const fullErr = fullLen < LIMITS.fullNameMin || fullLen > LIMITS.fullNameMax ? "register.err.fullNameLength" : null;
  const shortErr = shortLen < 1 ? "register.err.shortNameRequired" : shortLen > LIMITS.shortNameMax ? "register.err.shortNameLength" : null;
  const dirty = full.trim() !== org.full_name || short.trim() !== org.short_name;

  const logoUrl = preview ?? (org.logo_path ? getSupabase().storage.from("media").getPublicUrl(org.logo_path).data.publicUrl : null);
  const backend = () => supabaseRegisterBackend(getSupabase(), a.session!.user.id);

  const pickLogo = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setBusy(true);
    const c = await compressLogo(file);
    if (!c.ok) {
      setBusy(false);
      toast("error", t(c.error === "type" ? "register.err.logoType" : c.error === "tooBig" ? "register.err.logoTooBig" : "register.err.logoDecode"));
      return;
    }
    setPreview(URL.createObjectURL(c.logo.blob)); // optimistic
    try {
      const r = await replaceLogo(backend(), orgId, c.logo, org.logo_path, () => crypto.randomUUID());
      onLogo(r.path);
      toast(r.oldRemoved ? "ok" : "warn", r.oldRemoved ? t("settings.savedLogo") : t("settings.oldLogoKept"));
      a.refresh();
    } catch (e) {
      toast("error", t("settings.error", { message: errText(e) }));
    } finally {
      setPreview(null);
      setBusy(false);
    }
  };
  const dropLogo = async () => {
    if (!org.logo_path) return;
    setBusy(true);
    const old = org.logo_path;
    onLogo(null); // optimistic
    try {
      const r = await removeLogo(backend(), orgId, old);
      toast(r.oldRemoved ? "ok" : "warn", r.oldRemoved ? t("settings.removedLogo") : t("settings.oldLogoKept"));
      a.refresh();
    } catch (e) {
      onLogo(old);
      toast("error", t("settings.error", { message: errText(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="set-brand" className={`${card} gap-3.5`}>
      <h2 id="set-brand" className={h2}>{t("settings.brand")}</h2>
      <div className="flex flex-wrap items-center gap-3.5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className={`h-[60px] w-[60px] flex-none rounded-full bg-white object-contain ring-1 ring-adm-hair ${busy ? "opacity-60" : ""}`} />
        ) : (
          <div aria-hidden="true" style={{ background: org.accent_color }} className="flex h-[60px] w-[60px] flex-none items-center justify-center rounded-full text-[19px] font-extrabold text-white">
            {monogram(org.short_name)}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => pickLogo(e.target.files?.[0])} />
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={smallBtn}>
          {busy ? t("settings.logoWorking") : org.logo_path ? t("settings.logoChange") : t("settings.logoAdd")}
        </button>
        {org.logo_path && (
          <button type="button" disabled={busy} onClick={dropLogo} className="h-10 px-1 text-[13px] font-bold text-adm-danger disabled:opacity-50">
            {t("settings.logoRemove")}
          </button>
        )}
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!dirty || fullErr || shortErr) return;
          setSaving(true);
          await saveOrg({ full_name: full.trim(), short_name: short.trim() });
          setSaving(false);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="set-fn" className={fieldLabel}>{t("register.fullName")}</label>
          <input id="set-fn" value={full} maxLength={LIMITS.fullNameMax} onChange={(e) => setFull(e.target.value)} aria-invalid={Boolean(fullErr)} className={input} />
          {fullErr && dirty && <p className="text-[13px] font-semibold text-adm-danger">{t(fullErr)}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="set-sn" className={fieldLabel}>{t("register.shortName")}</label>
          <input id="set-sn" value={short} maxLength={LIMITS.shortNameMax} onChange={(e) => setShort(e.target.value)} aria-invalid={Boolean(shortErr)} aria-describedby="set-sn-hint" className={input} />
          <p id="set-sn-hint" className={`text-[12px] ${shortErr && dirty ? "font-semibold text-adm-danger" : "text-adm-muted"}`}>{shortErr && dirty ? t(shortErr) : t("register.shortNameHint")}</p>
        </div>
        {dirty && (
          <button type="submit" disabled={saving || Boolean(fullErr || shortErr)} className={`${primaryBtn} self-start`}>
            {saving ? t("settings.saving") : t("settings.saveNames")}
          </button>
        )}
      </form>
      <div className="flex flex-col gap-2">
        <span id="set-accent" className={fieldLabel}>{t("settings.accent")}</span>
        <div role="radiogroup" aria-labelledby="set-accent" className="flex flex-wrap gap-2.5">
          {SWATCHES.map((s) => {
            const on = s.color.toLowerCase() === org.accent_color.toLowerCase();
            return (
              <button
                key={s.color}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={t(`settings.swatch.${s.key}`)}
               
                onClick={() => !on && saveOrg({ accent_color: s.color })}
                style={{ background: s.color }}
                className={`flex h-11 w-11 items-center justify-center rounded-full border-[3px] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:cursor-not-allowed ${on ? "border-adm-ink" : "border-white shadow-[0_0_0_1px_#C9D8D0]"}`}
              >
                {on && <Icon d={ICON.check} size={18} strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ZoneCard({ org, saveOrg }: { org: OrgRow; saveOrg: (p: Partial<OrgRow>, okText?: string) => Promise<boolean> }) {
  const { t } = useT();
  const saved = useMemo<ZoneChoice>(() => ({ zone: org.zone, state: org.state, district: org.district, source: "current" }), [org.zone, org.state, org.district]);
  const [draft, setDraft] = useState<ZoneChoice | null>(saved);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [key, setKey] = useState(0);
  const changed = draft !== null && (draft.zone !== org.zone || draft.district !== org.district || draft.state !== org.state);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const ok = await saveOrg({ zone: draft.zone, state: draft.state, district: draft.district }, t("settings.savedZone", { zone: draft.zone }));
    setSaving(false);
    setConfirm(false);
    if (ok) {
      setDraft({ ...draft, source: "current" });
      setKey((k) => k + 1);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <ZonePicker key={key} value={draft} onChange={setDraft} id="set-zone" />
      {changed && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setConfirm(true)} className={primaryBtn}>
            {t("settings.saveZone")}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(saved);
              setKey((k) => k + 1);
            }}
            className={smallBtn + " h-11"}
          >
            {t("settings.cancel")}
          </button>
        </div>
      )}
      <Dialog open={confirm} onClose={() => !saving && setConfirm(false)} title={t("settings.zoneConfirmTitle", { zone: draft?.zone ?? "" })}>
        <p className="mb-5 text-[15px] leading-[1.5] text-adm-ink">{t("settings.zoneConfirmBody")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={saving} onClick={() => setConfirm(false)} className="h-[46px] rounded-xl border-[1.5px] border-adm-line bg-white text-[14px] font-bold">
            {t("settings.cancel")}
          </button>
          <button type="button" disabled={saving} onClick={save} className="h-[46px] rounded-xl bg-adm-green text-[14px] font-bold text-white disabled:opacity-60">
            {saving ? t("settings.saving") : t("settings.zoneConfirm")}
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function Stepper({ label, value, display, onStep, atMin, atMax, lessLabel, moreLabel }: {
  label: ReactNode; value: number; display: string; onStep: (d: number) => void; atMin: boolean; atMax: boolean; lessLabel: string; moreLabel: string;
}) {
  const btn = "flex h-11 w-11 items-center justify-center rounded-[10px] border border-adm-line bg-white text-[20px] text-adm-ink hover:bg-adm-ground focus-visible:outline-2 focus-visible:outline-adm-green disabled:opacity-40";
  return (
    <div className="flex h-14 items-center justify-between border-t border-adm-hair">
      <span className="text-[15px] font-bold">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={lessLabel} disabled={atMin} onClick={() => onStep(-1)} className={btn}>
          −
        </button>
        <output aria-live="polite" data-value={value} className="w-[68px] text-center text-[15px] font-extrabold">{display}</output>
        <button type="button" aria-label={moreLabel} disabled={atMax} onClick={() => onStep(1)} className={btn}>
          +
        </button>
      </div>
    </div>
  );
}

function IqamahCard({ set, saveSet }: { set: SettingsRow; saveSet: (p: Partial<SettingsRow>, debounce?: number) => Promise<boolean | undefined> }) {
  const { t } = useT();
  return (
    <section aria-labelledby="set-iq" className={`${card} gap-1`}>
      <h2 id="set-iq" className={h2}>{t("settings.iqamah")}</h2>
      <p className="mb-1.5 text-[12px] text-adm-muted">{t("settings.iqamahHint")}</p>
      {IQAMAH_KEYS.map((k) => {
        const name = waktuName(k, false).label;
        const v = set.iqamah[k];
        return (
          <Stepper
            key={k}
            label={name}
            value={v}
            display={t("settings.minutes", { n: v })}
           
            atMin={v <= IQAMAH.min}
            atMax={v >= IQAMAH.max}
            lessLabel={t("settings.less", { name })}
            moreLabel={t("settings.more", { name })}
            onStep={(d) => saveSet({ iqamah: stepIqamah(set.iqamah, k, d) }, 700)}
          />
        );
      })}
    </section>
  );
}

/** One day's prayer times for a zone, through the Phase 1 data layer (cache, bundled file, API). */
function useZoneDay(zone: string, dateKey: string): Extract<DayResult, { status: "ok" }> | null | "loading" {
  const [day, setDay] = useState<{ key: string; r: DayResult } | null>(null);
  useEffect(() => {
    let off = false;
    (async () => {
      const store = idbMonthStore();
      const data = createPrayerData({ store, loadYear: createFallbackLoader() });
      let r = await data.getDay(zone, dateKey);
      if (r.status !== "ok") {
        await refreshMonths(zone, Date.now(), store).catch(() => undefined);
        r = await data.getDay(zone, dateKey);
      }
      if (!off) setDay({ key: `${zone}|${dateKey}`, r });
    })();
    return () => {
      off = true;
    };
  }, [zone, dateKey]);
  if (!day || day.key !== `${zone}|${dateKey}`) return "loading";
  return day.r.status === "ok" ? day.r : null;
}

function JumaatCard({ set, saveSet, zone }: { set: SettingsRow; saveSet: (p: Partial<SettingsRow>, debounce?: number) => Promise<boolean | undefined>; zone: string }) {
  const { t, lang } = useT();
  const fridayKey = thisFridayKey(localDateKey(Date.now()));
  const day = useZoneDay(zone, fridayKey);
  const d = set.durations;
  // Same line breaks as the TV strip: only between the three parts.
  const example = day && day !== "loading" ? fridayExample(day.today, d, set.clock_24h) : null;
  const [y, m, dd] = fridayKey.split("-").map(Number);
  const dateText = new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString(lang === "en" ? "en-MY" : "ms-MY", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <section aria-labelledby="set-jumaat" className={`${card} gap-1`}>
      <h2 id="set-jumaat" className={h2}>{t("settings.jumaat")}</h2>
      <p className="mb-1.5 text-[12px] text-adm-muted">{t("settings.jumaatHint")}</p>
      <Stepper
        label={t("settings.khutbah")}
        value={d.khutbahMin}
        display={t("settings.minutes", { n: d.khutbahMin })}
        atMin={d.khutbahMin <= KHUTBAH.min}
        atMax={d.khutbahMin >= KHUTBAH.max}
        lessLabel={t("settings.less", { name: t("settings.khutbah") })}
        moreLabel={t("settings.more", { name: t("settings.khutbah") })}
        onStep={(s) => saveSet({ durations: stepKhutbah(d, s) }, 700)}
      />
      <Stepper
        label={t("settings.jumaatSolat")}
        value={d.jumaatSolatMin}
        display={t("settings.minutes", { n: d.jumaatSolatMin })}
        atMin={d.jumaatSolatMin <= JUMAAT_SOLAT.min}
        atMax={d.jumaatSolatMin >= JUMAAT_SOLAT.max}
        lessLabel={t("settings.less", { name: t("settings.jumaatSolat") })}
        moreLabel={t("settings.more", { name: t("settings.jumaatSolat") })}
        onStep={(s) => saveSet({ durations: stepJumaatSolat(d, s) }, 700)}
      />
      <div className="flex h-14 items-center justify-between gap-3 border-t border-adm-hair">
        <span id="set-friday-info" className="text-[15px] font-bold">{t("settings.showFriday")}</span>
        <button
          type="button"
          role="switch"
          aria-checked={d.showFridayInfo}
          aria-labelledby="set-friday-info"
          onClick={() => saveSet({ durations: { ...d, showFridayInfo: !d.showFridayInfo } })}
          className={`relative h-7 w-[46px] flex-none rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green ${d.showFridayInfo ? "bg-adm-green" : "bg-[#B9C8C0]"}`}
        >
          <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-[left] ${d.showFridayInfo ? "left-[21px]" : "left-[3px]"}`} />
        </button>
      </div>
      <div data-friday-example className={`mt-1 rounded-xl px-3.5 py-3 ${d.showFridayInfo ? "bg-adm-soft" : "bg-adm-ground"}`}>
        <p className="text-[12px] font-bold text-adm-muted">{t("settings.fridayExample", { date: dateText })}</p>
        {day === "loading" ? (
          <p className="mt-1 text-[14px] text-adm-muted">{t("app.loading")}</p>
        ) : example ? (
          <p aria-live="polite" className={`mt-1 text-[15px] font-bold leading-[1.45] ${d.showFridayInfo ? "text-adm-green" : "text-adm-muted"}`}>
            <span className="block text-[13px] font-extrabold tracking-[0.08em]">{FRIDAY_LABEL}</span>
            {example.map((part, i) => (
              <span key={i}>
                {i > 0 && " \u00b7 "}
                <span className="whitespace-nowrap">{part}</span>
              </span>
            ))}
          </p>
        ) : (
          <p className="mt-1 text-[14px] text-adm-muted">{t("settings.fridayNoTimes")}</p>
        )}
        {!d.showFridayInfo && <p className="mt-1 text-[12px] font-semibold text-adm-muted">{t("settings.fridayOff")}</p>}
      </div>
    </section>
  );
}

function DisplayCard({ set, saveSet }: { set: SettingsRow; saveSet: (p: Partial<SettingsRow>, debounce?: number) => Promise<boolean | undefined> }) {
  const { t } = useT();
  const [lines, setLines] = useState<string[]>(set.ticker.length ? set.ticker : [""]);
  const [saving, setSaving] = useState(false);
  const cleaned = cleanTicker(lines);
  const dirty = !sameLines(cleaned.lines, set.ticker);

  return (
    <section aria-labelledby="set-disp" className={`${card} gap-3.5`}>
      <h2 id="set-disp" className={h2}>{t("settings.display")}</h2>
      <div className="flex items-center justify-between gap-3">
        <span id="set-ar" className="text-[15px] font-semibold">{t("settings.arabic")}</span>
        <button
          type="button"
          role="switch"
          aria-checked={set.show_arabic}
          aria-labelledby="set-ar"
         
          onClick={() => saveSet({ show_arabic: !set.show_arabic })}
          className={`relative h-7 w-[46px] flex-none rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-60 ${set.show_arabic ? "bg-adm-green" : "bg-[#B9C8C0]"}`}
        >
          <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-[left] ${set.show_arabic ? "left-[21px]" : "left-[3px]"}`} />
        </button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span id="set-clock" className="text-[15px] font-semibold">{t("settings.clock")}</span>
        <Segmented labelledBy="set-clock" value={set.clock_24h ? "24" : "12"} options={[["12", t("settings.clock12")], ["24", t("settings.clock24")]]} onChange={(v) => saveSet({ clock_24h: v === "24" })} />
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!dirty || cleaned.error) return;
          setSaving(true);
          const ok = await saveSet({ ticker: cleaned.lines });
          setSaving(false);
          if (ok) setLines(cleaned.lines.length ? cleaned.lines : [""]);
        }}
      >
        <span className={fieldLabel}>{t("settings.ticker")}</span>
        <p className="text-[12px] text-adm-muted">{t("settings.tickerHint")}</p>
        {lines.map((l, i) => {
          const len = [...l.trim()].length;
          return (
            <div key={i} className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <input
                  value={l}
                 
                  maxLength={TICKER.chars}
                  aria-label={t("settings.tickerLine", { n: i + 1 })}
                  onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? e.target.value : x)))}
                  className={input}
                />
                <span aria-hidden="true" className={`self-end text-[11px] ${len > TICKER.chars ? "font-bold text-adm-danger" : "text-adm-muted"}`}>{len}/{TICKER.chars}</span>
              </div>
              {lines.length > 1 && (
                <button type="button" aria-label={t("settings.tickerRemove", { n: i + 1 })} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="flex h-[46px] w-11 flex-none items-center justify-center rounded-xl text-adm-muted hover:bg-adm-ground hover:text-adm-danger">
                  <Icon d={ICON.close} size={18} />
                </button>
              )}
            </div>
          );
        })}
        {cleaned.error && <p className="text-[13px] font-semibold text-adm-danger">{t(cleaned.error)}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {lines.length < TICKER.lines && (
            <button type="button" onClick={() => setLines((ls) => [...ls, ""])} className="h-11 px-1 text-[14px] font-bold text-adm-green">
              {t("settings.tickerAdd")}
            </button>
          )}
          {dirty && (
            <button type="submit" disabled={saving || Boolean(cleaned.error)} className={`${primaryBtn} ml-auto`}>
              {saving ? t("settings.saving") : t("settings.saveTicker")}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}