"use client";
// Template editor (PRD Phase 2 §4.5, designs/admin/Editor = phone, D-Editor = computer).
// /admin/templat/?key=kuliah (new) or ?id=<slide> (edit). Form from the schema, live preview with
// the real theme, shared schedule, Simpan draf / Terbit, "Duplikasi untuk minggu depan".
import Link from "next/link";
import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LayoutKey, ThemeId } from "@/core";
import { getSupabase } from "@/lib/supabase";
import { TEMPLATE_KEYS, type SlideView, type TemplateKey } from "@/templates";
import { AYAT_VERIFIED, IMAGE_FIELD_KEYS, TEMPLATES, defaultFields, getPath, setPath, shiftWeek, validateFields, type FieldErrors, type Fields, type ImageField } from "@/templates/schema";
import { useClock } from "../home/useHomeData";
import { usePrayerToday } from "../home/usePrayerToday";
import { useT } from "../i18n";
import { compressImage } from "../poster/compress";
import type { Encoded } from "../poster/encode";
import { fileError } from "../poster/logic";
import type { SlideStatus } from "../poster/save";
import { ROUTES } from "../routing";
import { ScheduleFields } from "../schedule/ScheduleFields";
import { defaultSchedule, scheduleFromRow, scheduleToRow, shiftSchedule, validateSchedule, type Schedule, type ScheduleErrors, type SlideScheduleRow } from "../schedule/logic";
import { useAdmin } from "../session";
import { readDurations, readIqamah } from "../settings/logic";
import { Dialog } from "../shell/Dialog";
import { ICON, Icon } from "../shell/icons";
import { useToasts } from "../shell/Toast";
import { saveTemplateSlide, supabaseTemplateBackend } from "./save";
import { PreviewStage, type PreviewContext, type PreviewTarget } from "./PreviewStage";
import { TemplateForm, type ImageState } from "./TemplateForm";

const card = "rounded-[18px] bg-adm-card shadow-[0_1px_3px_rgba(18,38,30,0.08)]";
const sectionTitle = "text-[13px] font-extrabold tracking-[0.06em] text-adm-muted uppercase";
const btnPrimary = "h-11 rounded-xl bg-adm-green px-5 text-[14px] font-bold text-white hover:bg-adm-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-50";
const btnSecondary = "h-11 rounded-xl border-[1.5px] border-adm-green bg-white px-4 text-[14px] font-bold text-adm-green disabled:opacity-50";

type Status = "new" | SlideStatus;
interface Screen { id: string; name: string; theme: ThemeId; layout: LayoutKey }

/** A broken half-typed value must never take the editor down: the preview just pauses. */
class PreviewBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean; key: string }> {
  state = { failed: false, key: this.props.resetKey };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  static getDerivedStateFromProps(p: { resetKey: string }, s: { failed: boolean; key: string }) {
    return p.resetKey !== s.key ? { failed: false, key: p.resetKey } : null;
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Values the theme can render while the form is still half filled (numbers as 0). */
function previewFields(key: TemplateKey, f: Fields): Fields {
  let out = { ...f };
  for (const d of TEMPLATES[key].fields) {
    if ((d.type === "money" || (d.type === "number" && d.required)) && typeof getPath(out, d.key) !== "number") out = setPath(out, d.key, 0);
    if (d.type === "number" && !d.required && typeof getPath(out, d.key) !== "number") out = setPath(out, d.key, undefined);
    if (d.type === "table") {
      const rows = getPath(out, d.key);
      if (Array.isArray(rows)) out = setPath(out, d.key, rows.map((r: Fields) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, d.columns.find((c) => c.key === k)?.type === "money" && typeof v !== "number" ? 0 : v]))));
    }
  }
  return out;
}

export function EditorView() {
  const a = useAdmin();
  const { t, lang } = useT();
  const { toast, clear: clearToasts, node: toasts } = useToasts();
  const org = a.current!;
  const now = useClock(30_000);
  const [params] = useState(() => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search));
  const [key, setKey] = useState<TemplateKey | null>(() => {
    const k = params.get("key");
    return k && (TEMPLATE_KEYS as readonly string[]).includes(k) ? (k as TemplateKey) : null;
  });
  const [slideId, setSlideId] = useState<string | null>(params.get("id"));
  const [status, setStatus] = useState<Status>("new");
  const [fields, setFields] = useState<Fields>(() => (key ? defaultFields(key) : {}));
  const [original, setOriginal] = useState<Fields | null>(null);
  const [pending, setPending] = useState<Record<string, { encoded: Encoded; kind: ImageField["imageKind"]; url: string }>>({});
  const [busyImage, setBusyImage] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule>(() => defaultSchedule(Date.now(), key ? TEMPLATES[key].schedule : undefined));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [schedErrors, setSchedErrors] = useState<ScheduleErrors>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(!params.get("id"));
  const [saving, setSaving] = useState<SlideStatus | null>(null);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [ctx, setCtx] = useState<PreviewContext | null>(null);
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const { day, loading: dayLoading } = usePrayerToday(org.zone, now);

  // Screens, settings for the preview, and (edit) the slide.
  useEffect(() => {
    const sb = getSupabase();
    sb.from("screens").select("id, name, theme, layout").eq("org_id", org.orgId).is("revoked_at", null).order("name").then(({ data }) => setScreens((data ?? []) as Screen[]));
    sb.from("org_settings").select("iqamah_min, durations, clock_24h, show_arabic, ticker").eq("org_id", org.orgId).single().then(({ data }) => {
      const logoUrl = org.logoPath ? sb.storage.from("media").getPublicUrl(org.logoPath).data.publicUrl : undefined;
      setCtx({
        masjid: { fullName: org.fullName, shortName: org.shortName, logoUrl },
        clock24h: Boolean(data?.clock_24h),
        showArabic: data?.show_arabic !== false,
        ticker: (data?.ticker as string[] | null) ?? [],
        iqamahMin: readIqamah(data?.iqamah_min),
        durations: readDurations(data?.durations),
      });
    });
    const id = params.get("id");
    if (!id) return;
    sb.from("slides").select("id, type, template_key, fields, status, starts_at, ends_at, duration_s, days_of_week, priority, screen_ids").eq("id", id).eq("org_id", org.orgId).maybeSingle().then(({ data, error }) => {
      if (error) return setLoadError(error.message);
      if (!data || data.type !== "template" || !(TEMPLATE_KEYS as readonly string[]).includes(data.template_key)) return setLoadError(t("editor.notFound"));
      const k = data.template_key as TemplateKey;
      setKey(k);
      setFields((data.fields as Fields) ?? {});
      setOriginal((data.fields as Fields) ?? {});
      setSchedule(scheduleFromRow(data as unknown as SlideScheduleRow, Date.now()));
      setStatus(data.status === "published" ? "published" : "draft");
      setLoaded(true);
    });
  }, [org.orgId, org.fullName, org.shortName, org.logoPath, params, t]);

  const meta = key ? TEMPLATES[key] : null;
  const targets = useMemo<PreviewTarget[]>(() => {
    const fromScreens = screens.filter((s) => s.layout !== "full").map((s) => ({ key: s.id, theme: s.theme, layout: s.layout, label: t("editor.screenOption", { name: s.name, theme: t(`theme.${s.theme}`), layout: t(`layout.${s.layout}`) }) }));
    const generic = (["tenang", "serambi", "alam"] as ThemeId[]).flatMap((th) => (["bottom", "side"] as LayoutKey[]).map((l) => ({ key: `${th}-${l}`, theme: th, layout: l, label: t("editor.themeOption", { theme: t(`theme.${th}`), layout: t(`layout.${l}`) }) })));
    return [...fromScreens, ...generic];
  }, [screens, t]);
  const target = targets.find((x) => x.key === targetKey) ?? targets[0];

  const images: Record<string, ImageState> = {};
  for (const k of IMAGE_FIELD_KEYS) {
    const path = fields[k];
    images[k] = {
      busy: busyImage === k,
      url: pending[k]?.url ?? (typeof path === "string" && path ? getSupabase().storage.from("media").getPublicUrl(path).data.publicUrl : null),
    };
  }

  const debounced = useDebounced(fields, 150);
  const slide = useMemo<SlideView | null>(() => {
    if (!key) return null;
    let f = previewFields(key, debounced);
    for (const k of IMAGE_FIELD_KEYS) f = setPath(f, k, images[k]?.url ?? undefined);
    return { kind: "template", template: key, fields: f } as unknown as SlideView;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, debounced, pending, original]);

  const pickImage = useCallback(
    async (k: string, file: File) => {
      if (!meta) return;
      const d = meta.fields.find((x) => x.key === k);
      if (!d || d.type !== "image") return;
      const bad = fileError(file.type, file.size);
      if (bad) return toast("error", t(bad));
      setBusyImage(k);
      const r = await compressImage(file, d.maxPx);
      setBusyImage(null);
      if (!r.ok) return toast("error", t(r.error === "tooBig" ? "poster.err.tooBigOut" : "poster.err.decode"));
      setPending((p) => {
        if (p[k]) URL.revokeObjectURL(p[k].url);
        return { ...p, [k]: { encoded: r.result, kind: d.imageKind, url: URL.createObjectURL(r.result.blob) } };
      });
    },
    [meta, t, toast],
  );
  const removeImage = (k: string) => {
    setPending((p) => {
      const n = { ...p };
      if (n[k]) URL.revokeObjectURL(n[k].url);
      delete n[k];
      return n;
    });
    setFields((f) => setPath(f, k, undefined));
  };

  const save = async (next: SlideStatus) => {
    if (!key || !meta) return;
    const fe = validateFields(key, fields);
    const se = validateSchedule(schedule, meta.schedule);
    setFieldErrors(fe);
    setSchedErrors(se);
    if (Object.keys(fe).length || Object.keys(se).length) {
      toast("error", t("editor.fixErrors"));
      document.querySelector("[aria-invalid=true]")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    setSaving(next);
    try {
      const r = await saveTemplateSlide(
        supabaseTemplateBackend(getSupabase(), a.session!.user.id, org.orgId),
        { orgId: org.orgId, templateKey: key, fields, pending: Object.fromEntries(Object.entries(pending).map(([k, v]) => [k, { encoded: v.encoded, kind: v.kind }])), original, imageKeys: IMAGE_FIELD_KEYS, schedule: scheduleToRow(schedule), status: next, slideId },
        () => crypto.randomUUID(),
      );
      // Fields as saved: new image paths come back through a reload of the row.
      const { data } = await getSupabase().from("slides").select("fields").eq("id", r.slideId).single();
      const saved = (data?.fields as Fields) ?? fields;
      Object.values(pending).forEach((p) => URL.revokeObjectURL(p.url));
      setPending({});
      setFields(saved);
      setOriginal(saved);
      setSlideId(r.slideId);
      setStatus(next);
      window.history.replaceState(null, "", `${ROUTES.template}?id=${r.slideId}`);
      clearToasts();
      toast(r.oldRemoved ? "ok" : "warn", !r.oldRemoved ? t("editor.oldKept") : slideId ? t("editor.updated") : next === "published" ? t("editor.published") : t("editor.savedDraft"));
    } catch (e) {
      toast("error", t("editor.saveError", { message: (e as { message?: string })?.message ?? String(e) }));
    } finally {
      setSaving(null);
    }
  };

  // Once errors are shown, each one disappears as soon as its field is fixed.
  useEffect(() => {
    if (!key) return;
    setFieldErrors((prev) => {
      if (!Object.keys(prev).length) return prev;
      const now = validateFields(key, fields);
      return Object.fromEntries(Object.entries(now).filter(([k]) => k in prev));
    });
  }, [fields, key]);
  useEffect(() => {
    setSchedErrors((prev) => {
      if (!Object.keys(prev).length) return prev;
      const now = validateSchedule(schedule, meta?.schedule);
      return Object.fromEntries(Object.entries(now).filter(([k]) => k in prev));
    });
  }, [schedule, meta]);

  const duplicate = () => {
    if (!key) return;
    setFields(shiftWeek(key, fields));
    setSchedule(shiftSchedule(schedule, 7));
    setOriginal(null); // shared pictures stay with the original slide
    setSlideId(null);
    setStatus("new");
    window.history.replaceState(null, "", `${ROUTES.template}?key=${key}`);
    toast("ok", t("editor.duplicated"));
    window.scrollTo?.(0, 0);
    document.querySelector("[data-admin-scroll]")?.scrollTo?.(0, 0);
  };

  if (loadError) return <p role="alert" className="rounded-xl bg-[#FDECE8] px-4 py-3 text-[14px] text-adm-danger">{t("editor.loadError", { message: loadError })}</p>;
  if (!loaded) return <p className={`${card} p-5 text-[14px] text-adm-muted`}>{t("app.loading")}</p>;
  if (!key || !meta) {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="rounded-xl bg-[#FDECE8] px-4 py-3 text-[14px] text-adm-danger">{t("editor.unknownTemplate")}</p>
        <Link href={ROUTES.picker} className="font-bold text-adm-green">{t("picker.title")}</Link>
      </div>
    );
  }

  const statusBadge = (
    <span className={`flex-none rounded-full px-2.5 py-1 text-[12px] font-extrabold ${status === "published" ? "bg-adm-soft text-adm-green-dark" : "bg-[#E3ECE7] text-[#3A4E45]"}`}>
      {t(status === "new" ? "editor.statusNew" : status === "draft" ? "editor.statusDraft" : "editor.statusPublished")}
    </span>
  );
  const buttons = (
    <>
      <button type="button" disabled={Boolean(saving)} onClick={() => save("draft")} className={btnSecondary}>
        {saving === "draft" ? t("editor.saving") : t("editor.saveDraft")}
      </button>
      <button type="button" disabled={Boolean(saving)} onClick={() => save("published")} className={btnPrimary}>
        {saving === "published" ? t("editor.saving") : t("editor.publish")}
      </button>
    </>
  );
  const dupButton = meta.weekly && slideId && (
    <button type="button" onClick={duplicate} className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-[14px] font-bold text-adm-green hover:bg-adm-soft">
      <Icon d="M8 8h11v11H8z M5 16V5h11" size={18} />
      {t("editor.duplicate")}
    </button>
  );

  const preview = !ctx || dayLoading ? (
    <p className="rounded-xl bg-adm-ground px-4 py-6 text-center text-[13px] text-adm-muted">{t("editor.loadingPreview")}</p>
  ) : day && day.status === "ok" && slide && target ? (
    <PreviewBoundary resetKey={JSON.stringify(debounced).length + target.key}>
      <PreviewStage slide={slide} target={target} day={day} now={now} ctx={ctx} label={t("editor.preview")} />
    </PreviewBoundary>
  ) : (
    <p className="rounded-xl bg-[#FFF4DF] px-4 py-3 text-[13px] text-[#6B4A12]">{t("editor.noTimes")}</p>
  );

  const notes = (
    <>
      {key === "kematian" && <p className="rounded-xl bg-[#F1F1F1] px-3.5 py-3 text-[13px] leading-[1.5] text-[#3A3A3A]">{t("editor.kematianNote")}</p>}
      {key === "ayat" && !AYAT_VERIFIED && <p className="rounded-xl bg-[#FFF4DF] px-3.5 py-3 text-[13px] leading-[1.5] text-[#6B4A12]">{t("editor.ayatNote")}</p>}
    </>
  );
  const form = (
    <>
      <section aria-labelledby="ed-details" className="flex flex-col gap-4">
        <h2 id="ed-details" className={sectionTitle}>{t("editor.details")}</h2>
        {notes}
        <TemplateForm templateKey={key} fields={fields} onChange={setFields} errors={fieldErrors} images={images} onPickImage={pickImage} onRemoveImage={removeImage} />
      </section>
      <div className="h-px bg-adm-hair" />
      <section aria-labelledby="ed-sched" className="flex flex-col gap-4">
        <h2 id="ed-sched" className={sectionTitle}>{t("schedule.title")}</h2>
        <ScheduleFields value={schedule} onChange={setSchedule} errors={schedErrors} screens={screens.filter((s) => s.layout !== "full")} rules={meta.schedule} />
      </section>
    </>
  );

  return (
    <div className="lg:-mx-10 lg:-my-8">
      {/* Top bar: phone = back + title + status; computer = sticky with the actions. */}
      <div className="flex items-center gap-2 lg:sticky lg:top-0 lg:z-20 lg:h-[76px] lg:border-b lg:border-[#DCE6E1] lg:bg-white lg:px-8">
        <Link href={slideId ? ROUTES.home : ROUTES.picker} aria-label={t("editor.back")} className="-ml-2 flex h-11 w-11 flex-none items-center justify-center rounded-full hover:bg-adm-hair">
          <Icon d={ICON.chevronLeft} size={22} />
        </Link>
        <h1 className="min-w-0 truncate text-[20px] font-extrabold">{meta.name[lang]}</h1>
        {statusBadge}
        <div className="ml-auto hidden items-center gap-2.5 lg:flex">
          {dupButton}
          {buttons}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:mt-0 lg:grid-cols-[440px_minmax(0,1fr)]">
        {/* Phone: preview first */}
        <div className="flex flex-col gap-2 lg:hidden">
          {preview}
          <div className="flex items-center justify-between gap-3 text-[13px] text-adm-muted">
            <span className="min-w-0 truncate">{target && t("editor.previewOf", { screen: target.label })}</span>
            <button type="button" onClick={() => setChoosing(true)} className="min-h-11 flex-none font-extrabold text-adm-green">
              {t("editor.change")}
            </button>
          </div>
        </div>

        <div className={`${card} mt-4 flex flex-col gap-5 p-4 lg:mt-0 lg:rounded-none lg:border-r lg:border-[#DCE6E1] lg:px-7 lg:py-6 lg:shadow-none`}>
          {form}
          {dupButton && <div className="lg:hidden">{dupButton}</div>}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-[76px] flex flex-col gap-4 px-8 py-6">
            <div className="flex items-center gap-3">
              <span className={sectionTitle}>{t("editor.livePreview")}</span>
              <label htmlFor="ed-target" className="sr-only">{t("editor.previewTitle")}</label>
              <select id="ed-target" value={target?.key ?? ""} onChange={(e) => setTargetKey(e.target.value)} className="ml-auto h-10 max-w-[360px] rounded-[10px] border border-adm-line bg-white px-2.5 text-[14px]">
                {targets.map((x) => (
                  <option key={x.key} value={x.key}>{x.label}</option>
                ))}
              </select>
            </div>
            {preview}
            <p className="max-w-[720px] text-[13px] leading-[1.5] text-adm-muted">{t("editor.previewNote", { zone: org.zone })}</p>
          </div>
        </div>
      </div>

      <div className="sticky bottom-[86px] z-10 mt-3 grid grid-cols-2 gap-2 bg-adm-ground py-2 lg:hidden">{buttons}</div>

      <Dialog open={choosing} onClose={() => setChoosing(false)} title={t("editor.previewTitle")}>
        <div role="radiogroup" className="flex flex-col gap-1.5">
          {targets.map((x) => (
            <button
              key={x.key}
              type="button"
              role="radio"
              aria-checked={x.key === target?.key}
              onClick={() => {
                setTargetKey(x.key);
                setChoosing(false);
              }}
              className={`min-h-11 rounded-xl px-3 py-2 text-left text-[15px] ${x.key === target?.key ? "bg-adm-soft font-bold" : "hover:bg-adm-ground"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </Dialog>
      {toasts}
    </div>
  );
}