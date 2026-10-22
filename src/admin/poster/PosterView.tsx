"use client";
// Poster upload / edit (PRD Phase 2 §6, designs/admin/Poster = phone, D-Poster = computer).
// Step 1: picture → compress (Web Worker) → fit + resolution check with real previews per screen.
// Step 2: schedule (shared ScheduleFields) → upload → media row → slide (type poster).
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { useT } from "../i18n";
import { formatBytes } from "../platform/logic";
import { ROUTES } from "../routing";
import { ScheduleFields } from "../schedule/ScheduleFields";
import { defaultSchedule, scheduleFromRow, scheduleToRow, validateSchedule, type Schedule, type ScheduleErrors, type SlideScheduleRow } from "../schedule/logic";
import { useAdmin } from "../session";
import { ICON, Icon } from "../shell/icons";
import { useToasts } from "../shell/Toast";
import { compressPoster } from "./compress";
import type { Encoded } from "./encode";
import { SLOTS, TV, fileError, fitOn, layoutAdvice, recommendedRows, resolutionCheck, shapeOf, type PosterLayout, type ScreenLite } from "./logic";
import { savePoster, supabasePosterBackend, type SlideStatus } from "./save";

const card = "rounded-[18px] bg-adm-card shadow-[0_1px_3px_rgba(18,38,30,0.08)]";
const primary = "h-[52px] rounded-[14px] bg-adm-green px-5 text-[15px] font-bold text-white hover:bg-adm-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-50";
const themeBg: Record<ScreenLite["theme"], string> = { alam: "#E58A27", serambi: "#0B1114", tenang: "#EAF3F8" };
const themePanel: Record<ScreenLite["theme"], string> = { alam: "rgba(8,18,28,0.35)", serambi: "#1C2A30", tenang: "#FFFFFF" };

interface Picture {
  url: string;
  width: number;
  height: number;
  name: string;
  /** New picture (to upload); null for the current picture of an existing poster. */
  encoded: Encoded | null;
  originalBytes: number | null;
}

interface Existing {
  slideId: string;
  path: string;
  schedule: SlideScheduleRow;
  status: SlideStatus;
}

/** The poster drawn like the TV does it: contain, with a blurred copy filling the rest. */
function PosterPreview({ pic, layout, theme, label }: { pic: Picture; layout: PosterLayout; theme: ScreenLite["theme"]; label: string }) {
  const slot = SLOTS[layout];
  const fit = fitOn(pic.width, pic.height, layout);
  const slotStyle = layout === "bottom" ? { left: 0, top: 0, width: "100%", height: `${(slot.h / TV.h) * 100}%` } : { left: 0, top: 0, height: "100%", width: `${(slot.w / TV.w) * 100}%` };
  const panelStyle = layout === "bottom" ? { left: 0, right: 0, bottom: 0, height: `${(1 - slot.h / TV.h) * 100}%` } : { right: 0, top: 0, bottom: 0, width: `${(1 - slot.w / TV.w) * 100}%` };
  return (
    <div role="img" aria-label={label} style={{ background: themeBg[theme] }} className="relative aspect-video w-full overflow-hidden rounded-[10px] border-[5px] border-[#1B1B1B]">
      <div className="absolute overflow-hidden bg-black" style={slotStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pic.url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-md" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pic.url}
          alt=""
          aria-hidden="true"
          className="absolute object-fill"
          style={{ left: `${fit.box.x * 100}%`, top: `${fit.box.y * 100}%`, width: `${fit.box.w * 100}%`, height: `${fit.box.h * 100}%` }}
        />
      </div>
      <div className={`absolute flex gap-[4%] p-[2%] ${layout === "bottom" ? "flex-row" : "flex-col"}`} style={{ ...panelStyle, background: theme === "alam" ? "rgba(8,18,28,0.55)" : themeBg[theme] }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex-1 rounded-[4px]" style={{ background: i === 1 ? "#E3B04B" : themePanel[theme] }} />
        ))}
      </div>
    </div>
  );
}

const fitTone = { full: "bg-adm-soft text-adm-green-dark", blur: "bg-[#FFF1D6] text-[#7A4700]", small: "bg-[#FDE7E2] text-[#7A1F0B]" } as const;

export function PosterView() {
  const a = useAdmin();
  const { t, locale } = useT();
  const { toast, node: toasts } = useToasts();
  const orgId = a.current!.orgId;
  const [screens, setScreens] = useState<ScreenLite[] | null>(null);
  const [editId] = useState(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("id")));
  const [existing, setExisting] = useState<Existing | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pic, setPic] = useState<Picture | null>(null);
  const [busy, setBusy] = useState(false);
  const [picError, setPicError] = useState<string | null>(null);
  const [step, setStep] = useState<"image" | "schedule" | "done">("image");
  const [schedule, setSchedule] = useState<Schedule>(() => defaultSchedule(Date.now()));
  const [schedErrors, setSchedErrors] = useState<ScheduleErrors>({});
  const [saving, setSaving] = useState<SlideStatus | null>(null);
  const [doneText, setDoneText] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Screens (for sizes, previews and targeting) and, in edit mode, the poster.
  useEffect(() => {
    const sb = getSupabase();
    sb.from("screens").select("id, name, theme, layout, revoked_at").eq("org_id", orgId).is("revoked_at", null).then(({ data, error }) => {
      if (error) setLoadError(error.message);
      else setScreens((data ?? []) as ScreenLite[]);
    });
    if (!editId) return;
    sb.from("slides")
      .select("id, type, status, starts_at, ends_at, duration_s, days_of_week, priority, screen_ids, media:media_id(path, width, height, bytes)")
      .eq("id", editId)
      .eq("org_id", orgId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return setLoadError(error.message);
        const m = (data as { media?: { path: string; width: number; height: number; bytes: number } | null } | null)?.media;
        if (!data || data.type !== "poster" || !m) return setLoadError(t("poster.notFound"));
        const row = data as unknown as SlideScheduleRow & { id: string; status: string };
        setExisting({ slideId: row.id, path: m.path, schedule: row, status: row.status === "draft" ? "draft" : "published" });
        setSchedule(scheduleFromRow(row, Date.now()));
        setPic({ url: sb.storage.from("media").getPublicUrl(m.path).data.publicUrl, width: m.width, height: m.height, name: t("poster.currentImage"), encoded: null, originalBytes: null });
      });
  }, [orgId, editId, t]);

  const pick = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      setPicError(null);
      const bad = fileError(file.type, file.size);
      if (bad) return setPicError(bad);
      setBusy(true);
      const r = await compressPoster(file);
      setBusy(false);
      if (!r.ok) return setPicError(r.error === "tooBig" ? "poster.err.tooBigOut" : "poster.err.decode");
      setPic((old) => {
        if (old?.encoded) URL.revokeObjectURL(old.url);
        return { url: URL.createObjectURL(r.result.blob), width: r.result.width, height: r.result.height, name: file.name || "poster", encoded: r.result, originalBytes: file.size };
      });
    },
    [],
  );

  // Paste from the clipboard (computer; works on phones that support it too).
  useEffect(() => {
    if (step !== "image") return;
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith("image/"));
      if (f) {
        e.preventDefault();
        pick(f);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [step, pick]);

  const rows = useMemo(() => recommendedRows(screens ?? []), [screens]);
  const posterScreens = rows.filter((r) => r.slot).map((r) => r.screen) as (ScreenLite & { layout: PosterLayout })[];
  const targets: { key: string; name: string; theme: ScreenLite["theme"]; layout: PosterLayout }[] = posterScreens.length
    ? posterScreens.map((s) => ({ key: s.id, name: s.name, theme: s.theme, layout: s.layout }))
    : (["bottom", "side"] as PosterLayout[]).map((l) => ({ key: l, name: t(`layout.${l}`), theme: "tenang" as const, layout: l }));
  const layouts = targets.map((x) => x.layout);
  const res = pic ? resolutionCheck(pic.width, pic.height, layouts) : null;
  const advice = pic ? layoutAdvice(pic.width, pic.height, layouts) : null;

  const save = async (status: SlideStatus) => {
    const e = validateSchedule(schedule);
    setSchedErrors(e);
    if (Object.keys(e).length || !pic) return;
    setSaving(status);
    try {
      const r = await savePoster(
        supabasePosterBackend(getSupabase(), a.session!.user.id),
        { orgId, image: pic.encoded, schedule: scheduleToRow(schedule), status, existing: existing ? { slideId: existing.slideId, path: existing.path } : null },
        () => crypto.randomUUID(),
      );
      if (!r.oldRemoved) toast("warn", t("poster.oldKept"));
      setDoneText(existing ? t("poster.updated") : status === "draft" ? t("poster.doneDraft") : t("poster.done"));
      setStep("done");
    } catch (err) {
      toast("error", t("poster.saveError", { message: (err as { message?: string })?.message ?? String(err) }));
    } finally {
      setSaving(null);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0]);
  };

  if (loadError) return <p role="alert" className="rounded-xl bg-[#FDECE8] px-4 py-3 text-[14px] text-adm-danger">{t("poster.loadError", { message: loadError })}</p>;

  const header = (
    <div className="flex items-center gap-2">
      {step === "schedule" ? (
        <button type="button" onClick={() => setStep("image")} aria-label={t("poster.backToImage")} className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-adm-hair">
          <Icon d={ICON.chevronLeft} size={22} />
        </button>
      ) : (
        <Link href={ROUTES.home} aria-label={t("poster.back")} className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-adm-hair">
          <Icon d={ICON.chevronLeft} size={22} />
        </Link>
      )}
      <h1 className="flex-1 text-[22px] font-extrabold lg:text-[26px]">{existing ? t("poster.editTitle") : t("poster.title")}</h1>
      {step === "image" && (
        <button type="button" disabled={!pic || busy} onClick={() => setStep("schedule")} className={`${primary} hidden h-11 lg:block`}>
          {t("poster.next")}
        </button>
      )}
    </div>
  );

  if (step === "done") {
    return (
      <>
        {header}
        <div className={`${card} flex flex-col items-center gap-4 p-8 text-center`}>
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-adm-soft text-adm-green">
            <Icon d={ICON.check} size={32} strokeWidth={2.5} />
          </span>
          <p role="status" className="text-[17px] font-bold">{doneText}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => window.location.assign(ROUTES.poster)} className={primary}>
              {t("poster.another")}
            </button>
            <Link href={ROUTES.home} className="flex h-[52px] items-center rounded-[14px] border border-adm-line bg-white px-5 text-[15px] font-bold">
              {t("poster.home")}
            </Link>
          </div>
        </div>
        {toasts}
      </>
    );
  }

  if (step === "schedule") {
    return (
      <>
        {header}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[460px_minmax(0,1fr)] lg:gap-8">
          <section className={`${card} p-4 lg:p-5`} aria-label={t("schedule.title")}>
            <h2 className="mb-4 text-[17px] font-extrabold">{t("schedule.title")}</h2>
            <ScheduleFields value={schedule} onChange={setSchedule} errors={schedErrors} screens={posterScreens.map((s) => ({ id: s.id, name: s.name }))} />
          </section>
          {pic && (
            <div className="hidden flex-col gap-3 lg:flex">
              <PosterPreview pic={pic} layout={targets[0].layout} theme={targets[0].theme} label={t("poster.previewLabel", { layout: t(`layout.${targets[0].layout}`) })} />
            </div>
          )}
        </div>
        <div className="sticky bottom-[86px] z-10 grid grid-cols-2 gap-2 bg-adm-ground py-2 lg:static lg:flex lg:justify-end">
          <button type="button" disabled={Boolean(saving)} onClick={() => save("draft")} className="h-[52px] rounded-[14px] border border-adm-line bg-white px-5 text-[15px] font-bold disabled:opacity-50">
            {saving === "draft" ? t("poster.saving") : t("poster.saveDraft")}
          </button>
          <button type="button" disabled={Boolean(saving)} onClick={() => save("published")} className={primary}>
            {saving === "published" ? t("poster.saving") : t("poster.publish")}
          </button>
        </div>
        {toasts}
      </>
    );
  }

  const shape = pic ? t(`poster.shape.${shapeOf(pic.width, pic.height)}`) : "";
  return (
    <>
      {header}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[460px_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-4">
          <section aria-labelledby="poster-rec" className={`${card} flex flex-col gap-3 p-4`}>
            <h2 id="poster-rec" className="flex items-center gap-2 text-[15px] font-extrabold">
              <Icon d="M4 8V4h4 M16 4h4v4 M20 16v4h-4 M8 20H4v-4" size={20} className="text-adm-green" />
              {t("poster.recTitle")}
            </h2>
            {!screens ? (
              <p className="text-[13px] text-adm-muted">{t("app.loading")}</p>
            ) : posterScreens.length === 0 ? (
              <>
                <p className="text-[13px] text-adm-muted">{t("poster.recNone")}</p>
                {(["bottom", "side"] as PosterLayout[]).map((l) => (
                  <div key={l} className="flex justify-between gap-3 text-[14px]">
                    <span className="text-adm-muted">{t(`layout.${l}`)}</span>
                    <b className="text-adm-green">{t("poster.size", { w: SLOTS[l].w, h: SLOTS[l].h })}</b>
                  </div>
                ))}
              </>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {rows.map(({ screen: s, slot }) => (
                  <li key={s.id} className="flex items-center gap-3">
                    <span aria-hidden="true" className="flex h-[30px] w-[42px] flex-none items-center justify-center">
                      <span className="rounded-[2px] border-2" style={slot ? { width: (slot.w / 1920) * 40, height: (slot.h / 1920) * 40, borderColor: "#146C4A" } : { width: 30, height: 17, borderColor: "#B7C6BE" }} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14px] font-bold">{s.name} · {t(`layout.${s.layout}`)}</span>
                      <span className={`text-[13px] font-extrabold ${slot ? "text-adm-green" : "text-adm-muted"}`}>{slot ? t("poster.size", { w: slot.w, h: slot.h }) : t("poster.recNotShown")}</span>
                      <span className="text-[12px] text-adm-muted">{!slot ? t("poster.recNoteFull") : s.layout === "bottom" ? t("poster.recNoteWide") : t("poster.recNoteSquare")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="rounded-[10px] bg-adm-soft px-3 py-2 text-[12px] leading-[1.5] text-[#3A4E45]">
              <span className="lg:hidden">{t("poster.canva")}</span>
              <span className="hidden lg:inline">{t("poster.canvaDesktop")}</span>
            </p>
          </section>

          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          {/* Phone: big button. Computer: drop zone (+ paste). */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className={`${card} flex flex-col items-center gap-2 border-[1.5px] border-dashed border-[#A9C2B5] px-4 py-6 text-center lg:hidden`}
          >
            <Icon d="M12 16V4 M7 9l5-5 5 5 M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" size={30} className="text-adm-green" />
            <span className="text-[16px] font-extrabold">{busy ? t("poster.processing") : pic ? t("poster.change") : t("poster.pick")}</span>
            <span className="text-[12px] text-adm-muted">{t("poster.rules")}</span>
          </button>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`hidden min-h-[220px] flex-col items-center justify-center gap-2.5 rounded-[18px] border-2 border-dashed p-5 text-center lg:flex ${dragging ? "border-adm-green bg-adm-soft" : "border-adm-green bg-[#F1F8F4]"}`}
          >
            <Icon d="M12 16V4 M7 9l5-5 5 5 M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" size={44} strokeWidth={1.6} className="text-adm-green" />
            <span className="text-[17px] font-extrabold">{busy ? t("poster.processing") : t("poster.drop")}</span>
            <span className="text-[13px] text-adm-muted">{t("poster.or")}</span>
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="h-11 rounded-xl border-[1.5px] border-adm-green bg-white px-4 text-[14px] font-bold text-adm-green disabled:opacity-50">
              {t("poster.pickDesktop")}
            </button>
            <span className="text-[12px] text-adm-muted">{t("poster.rules")}</span>
            <span className="text-[12px] text-adm-muted">{t("poster.pasteHint")}</span>
          </div>
          {picError && <p role="alert" className="rounded-xl bg-[#FDECE8] px-3.5 py-3 text-[14px] text-adm-danger">{t(picError)}</p>}

          {pic && res && (
            <section aria-label={pic.name} className={`${card} flex flex-col gap-3 p-3.5`}>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pic.url} alt="" className="h-[44px] w-[60px] flex-none rounded-[4px] bg-adm-ground object-contain" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[14px] font-bold">{pic.name}</span>
                  <span className="text-[12px] text-adm-muted">{t("poster.dims", { w: pic.width, h: pic.height, shape })}</span>
                  {pic.encoded && pic.originalBytes !== null && (
                    <span className="text-[12px] font-semibold text-adm-ink">{t("poster.sizes", { before: formatBytes(pic.originalBytes, locale), after: formatBytes(pic.encoded.blob.size, locale) })}</span>
                  )}
                </div>
                <span className={`hidden flex-none rounded-full px-2.5 py-1 text-[12px] font-extrabold lg:inline ${res.ok ? "bg-adm-soft text-adm-green-dark" : "bg-[#FDE7E2] text-[#7A1F0B]"}`}>{res.ok ? t("poster.badgeGood") : t("poster.badgeLow")}</span>
              </div>
              <p role={res.ok ? undefined : "alert"} className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13px] leading-[1.45] ${res.ok ? "bg-adm-soft text-adm-green-dark" : "bg-[#FDE7E2] text-[#7A1F0B]"}`}>
                <Icon d={res.ok ? "M5 12l5 5L20 7" : "M12 8v5 M12 16.5v.5 M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"} size={18} strokeWidth={2.2} className="mt-px flex-none" />
                <span>
                  <b>{res.ok ? t("poster.resGood") : t("poster.resLow")}</b>{" "}
                  {res.ok
                    ? t("poster.resGoodText")
                    : [res.upscaled ? t("poster.resLowUp", { x: res.maxScale.toFixed(1) }) : "", res.lowWidth ? t("poster.resLowWidth", { w: pic.originalBytes !== null && pic.encoded ? pic.encoded.originalWidth : pic.width }) : "", t("poster.resFix")].filter(Boolean).join(" ")}
                </span>
              </p>
            </section>
          )}
        </div>

        {pic && (
          <section aria-labelledby="poster-prev" className="flex flex-col gap-3 lg:gap-4">
            <h2 id="poster-prev" className="text-[13px] font-extrabold tracking-[0.06em] text-adm-muted uppercase">{t("poster.previews")}</h2>
            <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
              {targets.map((s) => {
                const fit = fitOn(pic.width, pic.height, s.layout);
                return (
                  <li key={s.key} className="flex flex-col gap-2">
                    <PosterPreview pic={pic} layout={s.layout} theme={s.theme} label={t("poster.previewLabel", { layout: t(`layout.${s.layout}`) })} />
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="min-w-0 truncate text-adm-muted">
                        {s.name} · {t(`theme.${s.theme}`)} · {t(`layout.${s.layout}`)}
                      </span>
                      <span className={`flex-none rounded-full px-2 py-0.5 font-extrabold ${fitTone[fit.label]}`}>{t(`poster.fit.${fit.label}`)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
            {advice && advice.good.length > 0 && advice.weak.length > 0 && (
              <p className="max-w-[760px] text-[13px] leading-[1.5] text-adm-muted">
                {t("poster.onlyOne", {
                  good: advice.good.map((l) => t(`layout.${l}`)).join(", "),
                  weak: advice.weak.map((l) => t(`layout.${l}`)).join(", "),
                  size: t("poster.size", { w: SLOTS[advice.weak[0]].w, h: SLOTS[advice.weak[0]].h }),
                })}
              </p>
            )}
          </section>
        )}
      </div>
      <div className="sticky bottom-[86px] z-10 bg-adm-ground py-2 lg:hidden">
        <button type="button" disabled={!pic || busy} onClick={() => setStep("schedule")} className={`${primary} w-full`}>
          {t("poster.next")}
        </button>
      </div>
      {toasts}
    </>
  );
}