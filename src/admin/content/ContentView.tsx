"use client";
// Kandungan (designs/admin/Content = phone, D-Content = computer). Drag to reorder with
// @dnd-kit (touch, mouse and keyboard), plus up/down buttons for screen readers; the new order is
// saved in one request (reorder_slides, migration 0005). Switch = show/pause, menu = Duplikasi/Padam.
import { DndContext, KeyboardSensor, type Announcements, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase";
import { IMAGE_FIELD_KEYS, TEMPLATES } from "@/templates/schema";
import { supabaseTemplateBackend } from "../editor/save";
import { useClock } from "../home/useHomeData";
import { useT } from "../i18n";
import { ROUTES } from "../routing";
import { useAdmin } from "../session";
import { Dialog } from "../shell/Dialog";
import { ICON, Icon } from "../shell/icons";
import { useToasts } from "../shell/Toast";
import { useIsDesktop } from "../shell/useIsDesktop";
import { TABS, applyReorder, countTabs, shortDate, dateLabel, daysLabel, daysLeft, duplicateRow, move, screensLabel, titleOf, toggledStatus, visibleRows, type ContentRow, type Tab } from "./logic";
import { removeSlide } from "./remove";

const card = "rounded-[16px] bg-adm-card shadow-[0_1px_3px_rgba(18,38,30,0.08)]";
const POSTER_STYLE = { code: "IMG", bg: "#E6EEF8", fg: "#1F4E8A" };
const GRIP = "M9 6h.01 M15 6h.01 M9 12h.01 M15 12h.01 M9 18h.01 M15 18h.01";
const DOTS = "M12 6h.01 M12 12h.01 M12 18h.01";
const COLS = "grid-cols-[44px_120px_minmax(0,1fr)_150px_64px_130px_150px_72px_52px]";

interface Screen { id: string; name: string }

function useContent(orgId: string) {
  const [rows, setRows] = useState<ContentRow[] | null>(null);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const sb = getSupabase();
    const [s, sc] = await Promise.all([
      sb.from("slides").select("id, type, template_key, fields, media_id, status, starts_at, ends_at, duration_s, days_of_week, priority, sort_order, screen_ids, created_at, media:media_id(path)").eq("org_id", orgId),
      sb.from("screens").select("id, name").eq("org_id", orgId).is("revoked_at", null).order("name"),
    ]);
    if (s.error) setError(s.error.message);
    else {
      setError(null);
      setRows(s.data as unknown as ContentRow[]);
    }
    setScreens((sc.data ?? []) as Screen[]);
  }, [orgId]);
  useEffect(() => {
    load();
  }, [load]);
  return { rows, setRows, screens, error, reload: load };
}

export function ContentView() {
  const a = useAdmin();
  const { t, lang } = useT();
  const desktop = useIsDesktop();
  const { toast, node: toasts } = useToasts();
  const orgId = a.current!.orgId;
  const now = useClock(60_000);
  const { rows, setRows, screens, error, reload } = useContent(orgId);
  const [tab, setTab] = useState<Tab>("aktif");
  const [query, setQuery] = useState("");
  const [screenId, setScreenId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<ContentRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ContentRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState("");

  const typeName = useCallback((r: ContentRow) => (r.type === "poster" ? t("template.poster") : t(`template.${r.template_key}`)), [t]);
  const all = rows ?? [];
  const counts = countTabs(all, now);
  const list = useMemo(() => visibleRows(all, tab, now, query, screenId, typeName), [all, tab, now, query, screenId, typeName]);
  const canReorder = tab !== "tamat";
  const title = (r: ContentRow) => titleOf(r) || (r.type === "poster" ? `${t("template.poster")} · ${shortDate(r.starts_at, lang)}` : t("content.untitled"));
  const thumb = (r: ContentRow) => (r.type === "poster" && r.media?.path ? getSupabase().storage.from("media").getPublicUrl(r.media.path).data.publicUrl : null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Optimistic: the list moves at once; on error it goes back and a toast explains. */
  const saveOrder = async (newVisible: string[]) => {
    const before = rows;
    const order = applyReorder(all, newVisible);
    const pos = new Map(order.map((id, i) => [id, i + 1]));
    setRows(all.map((r) => ({ ...r, sort_order: pos.get(r.id) ?? r.sort_order })));
    const { error: e } = await getSupabase().rpc("reorder_slides", { p_org: orgId, p_ids: order });
    if (e) {
      setRows(before);
      toast("error", e.code === "PGRST202" ? t("content.needsMigration") : t("content.error", { message: e.message }));
    } else toast("ok", t("content.reordered"));
  };
  const onDragEnd = (ev: DragEndEvent) => {
    if (!ev.over || ev.active.id === ev.over.id) return;
    const ids = list.map((r) => r.id);
    saveOrder(move(ids, ids.indexOf(String(ev.active.id)), ids.indexOf(String(ev.over.id))));
  };
  const nudge = (r: ContentRow, delta: number) => {
    const ids = list.map((x) => x.id);
    const i = ids.indexOf(r.id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    setLive(t("content.moved", { title: title(r), n: j + 1, total: ids.length }));
    saveOrder(move(ids, i, j));
  };

  // Screen reader messages in BM/EN with titles and positions (instead of English internal ids).
  const where = (id: string | number) => {
    const i = list.findIndex((x) => x.id === String(id));
    const r = list[i];
    return { title: r ? title(r) : "", n: i + 1, total: list.length };
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => t("content.dnd.pickedUp", where(active.id)),
    onDragOver: ({ active, over }) => (over ? t("content.dnd.over", { ...where(over.id), title: where(active.id).title }) : undefined),
    onDragEnd: ({ active, over }) => (over ? t("content.dnd.dropped", { ...where(over.id), title: where(active.id).title }) : t("content.dnd.cancelled", where(active.id))),
    onDragCancel: ({ active }) => t("content.dnd.cancelled", where(active.id)),
  };

  const toggle = async (r: ContentRow) => {
    const next = toggledStatus(r.status);
    setRows(all.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
    const { error: e } = await getSupabase().from("slides").update({ status: next }).eq("id", r.id);
    if (e) {
      setRows(all);
      toast("error", t("content.error", { message: e.message }));
    } else toast("ok", next === "published" ? t("content.shown") : t("content.pausedDone"));
  };

  const duplicate = async (r: ContentRow) => {
    setMenuFor(null);
    const { error: e } = await getSupabase().from("slides").insert(duplicateRow(r, orgId));
    if (e) return toast("error", t("content.error", { message: e.message }));
    toast("ok", t("content.duplicated"));
    reload();
  };

  const remove = async (r: ContentRow) => {
    setBusy(true);
    const sb = getSupabase();
    try {
      const res = await removeSlide(
        {
          ...supabaseTemplateBackend(sb, a.session!.user.id, orgId),
          async deleteSlide(id) {
            const { data, error: e } = await sb.from("slides").delete().eq("id", id).select("id");
            if (e) throw e;
            if (!data?.length) throw new Error("not_allowed");
          },
        },
        r,
        IMAGE_FIELD_KEYS,
      );
      setRows(all.filter((x) => x.id !== r.id));
      toast(res.filesKept ? "warn" : "ok", res.filesKept ? t("content.deletedKept") : t("content.deleted"));
    } catch (e) {
      toast("error", t("content.error", { message: (e as { message?: string })?.message ?? String(e) }));
    } finally {
      setBusy(false);
      setConfirmDelete(null);
    }
  };

  const meta = (r: ContentRow) => {
    const d = dateLabel(r, now, false, lang);
    const parts = [
      r.template_key === "kematian" && r.ends_at && tab !== "tamat" ? t("content.autoEnd", { n: daysLeft(r.ends_at, now) ?? "" }) : t(`content.date.${d.kind}`, d as unknown as Record<string, string>),
      tab !== "tamat" ? t("content.seconds", { n: r.duration_s }) : "",
      daysLabel(r.days_of_week, (x) => t(`schedule.day.${x}`)) ?? "",
    ];
    return parts.filter(Boolean).join(" · ");
  };
  const editHref = (r: ContentRow) => `${r.type === "poster" ? ROUTES.poster : ROUTES.template}?id=${r.id}`;
  const style = (r: ContentRow) => (r.type === "poster" ? POSTER_STYLE : r.template_key ? TEMPLATES[r.template_key] : POSTER_STYLE);

  const badges = (r: ContentRow) => (
    <>
      {r.priority && <span className="flex-none rounded-md bg-[#FDE7E2] px-1.5 py-0.5 text-[11px] font-extrabold text-[#9B2C14]">{t("content.priority")}</span>}
      {r.status === "draft" && <span className="flex-none rounded-md bg-[#E3ECE7] px-1.5 py-0.5 text-[11px] font-extrabold text-[#3A4E45]">{t("content.draft")}</span>}
      {r.status === "paused" && tab !== "tamat" && <span className="flex-none rounded-md bg-[#FFF1D6] px-1.5 py-0.5 text-[11px] font-extrabold text-[#7A4700]">{t("content.paused")}</span>}
    </>
  );
  const sw = (r: ContentRow) => (
    <button
      type="button"
      role="switch"
      aria-checked={r.status === "published"}
      aria-label={t("content.show", { title: title(r) })}
      disabled={tab === "tamat"}
      onClick={() => toggle(r)}
      className={`relative h-7 w-[46px] flex-none rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-40 ${r.status === "published" ? "bg-adm-green" : "bg-[#C3D1CA]"}`}
    >
      <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-[left] ${r.status === "published" ? "left-[21px]" : "left-[3px]"}`} />
    </button>
  );
  const moreBtn = (r: ContentRow) => (
    <button type="button" aria-label={t("content.more", { title: title(r) })} aria-haspopup="dialog" onClick={() => setMenuFor(r)} className="flex h-11 w-10 flex-none items-center justify-center rounded-[10px] text-adm-muted hover:bg-adm-ground">
      <Icon d={DOTS} size={22} strokeWidth={3} />
    </button>
  );

  return (
    <>
      <div className="flex items-center justify-between lg:hidden">
        <h1 className="text-[26px] font-extrabold tracking-[-0.3px]">{t("content.title")}</h1>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="tablist" aria-label={t("content.tabs")} className="grid grid-cols-3 rounded-[14px] bg-[#E3ECE7] p-1 lg:flex lg:rounded-xl">
          {TABS.map((k) => {
            const on = tab === k;
            return (
              <button key={k} type="button" role="tab" aria-selected={on} onClick={() => setTab(k)} className={`h-10 rounded-[11px] px-4 text-[14px] font-bold focus-visible:outline-2 focus-visible:outline-adm-green lg:h-[38px] lg:rounded-[9px] ${on ? "bg-white text-adm-ink shadow-[0_1px_3px_rgba(18,38,30,0.12)]" : "text-adm-muted"}`}>
                {counts[k] ? t("content.tabCount", { label: t(`content.tab.${k}`), n: counts[k] }) : t(`content.tab.${k}`)}
              </button>
            );
          })}
        </div>
        <label htmlFor="ct-q" className="sr-only">{t("content.search")}</label>
        <input id="ct-q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("content.search")} className="hidden h-11 w-[260px] rounded-xl border border-adm-line bg-white px-3.5 text-[14px] lg:block" />
        <select aria-label={t("content.screenFilter")} value={screenId ?? ""} onChange={(e) => setScreenId(e.target.value || null)} className="hidden h-11 rounded-xl border border-adm-line bg-white px-3 text-[14px] lg:block">
          <option value="">{t("content.allScreens")}</option>
          {screens.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {canReorder && <span className="text-[13px] text-adm-muted lg:ml-auto">{desktop ? t("content.dragHintDesktop") : t("content.dragHint")}</span>}
      </div>

      {error && <p role="alert" className="rounded-xl bg-[#FDECE8] px-4 py-3 text-[14px] text-adm-danger">{t("content.loadError", { message: error })}</p>}
      <p aria-live="polite" className="sr-only">{live}</p>

      {!rows && !error ? (
        <p className={`${card} p-5 text-[14px] text-adm-muted`}>{t("app.loading")}</p>
      ) : list.length === 0 ? (
        <p className={`${card} p-5 text-[14px] text-adm-muted`}>{query || screenId ? t("content.noMatch") : t(`content.empty.${tab}`)}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={{ announcements, screenReaderInstructions: { draggable: t("content.dnd.instructions") } }}>
          <SortableContext items={list.map((r) => r.id)} strategy={verticalListSortingStrategy} disabled={!canReorder}>
            {desktop ? (
              <div className={`${card} overflow-hidden rounded-[18px]`} role="table">
                <div role="row" className={`grid ${COLS} h-12 items-center border-b border-adm-hair bg-[#F7FAF8] px-3 text-[12px] font-extrabold tracking-[0.04em] text-adm-muted uppercase`}>
                  <span role="columnheader" />
                  {(["type", "title", "dates", "secs", "days", "screens", "show"] as const).map((c) => (
                    <span key={c} role="columnheader">{t(`content.col.${c}`)}</span>
                  ))}
                  <span role="columnheader" />
                </div>
                {list.map((r, i) => (
                  <SortableItem key={r.id} id={r.id} disabled={!canReorder}>
                    {(bits) => {
                      const handle = () => <Handle bits={bits} label={t("content.drag", { title: title(r) })} upLabel={t("content.moveUp", { title: title(r) })} downLabel={t("content.moveDown", { title: title(r) })} disabled={!canReorder} first={i === 0} last={i === list.length - 1} onUp={() => nudge(r, -1)} onDown={() => nudge(r, 1)} />;
                      const d = dateLabel(r, now, true, lang);
                      const st = style(r);
                      return (
                        <div role="row" className={`grid ${COLS} min-h-[68px] items-center border-b border-[#EEF3F0] px-3 text-[14px] last:border-0 ${r.status !== "published" ? "bg-[#FAFBFA]" : "bg-white"}`}>
                          <span role="cell">{handle()}</span>
                          <span role="cell"><span style={{ background: st.bg, color: st.fg }} className="inline-flex rounded-full px-2.5 py-1 text-[12px] font-extrabold">{typeName(r)}</span></span>
                          <span role="cell" className="flex min-w-0 items-center gap-2">
                            <Link href={editHref(r)} className="truncate font-bold text-adm-ink hover:text-adm-green">{title(r)}</Link>
                            {badges(r)}
                          </span>
                          <span role="cell" className="text-[#3A4E45]">{r.template_key === "kematian" && tab !== "tamat" && r.ends_at ? t("content.autoEnd", { n: daysLeft(r.ends_at, now) ?? "" }) : t(`content.date.${d.kind}`, d as unknown as Record<string, string>)}</span>
                          <span role="cell" className="text-[#3A4E45]">{t("content.seconds", { n: r.duration_s })}</span>
                          <span role="cell" className="truncate text-[#3A4E45]">{daysLabel(r.days_of_week, (x) => t(`schedule.day.${x}`)) ?? t("content.everyDay")}</span>
                          <span role="cell" className="truncate text-[#3A4E45]">{screensLabel(r.screen_ids, screens) ?? t("content.allScreens")}</span>
                          <span role="cell">{sw(r)}</span>
                          <span role="cell">{moreBtn(r)}</span>
                        </div>
                      );
                    }}
                  </SortableItem>
                ))}
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {list.map((r, i) => (
                  <SortableItem key={r.id} id={r.id} disabled={!canReorder} as="li">
                    {(bits) => {
                      const handle = () => <Handle bits={bits} label={t("content.drag", { title: title(r) })} upLabel={t("content.moveUp", { title: title(r) })} downLabel={t("content.moveDown", { title: title(r) })} disabled={!canReorder} first={i === 0} last={i === list.length - 1} onUp={() => nudge(r, -1)} onDown={() => nudge(r, 1)} />;
                      const st = style(r);
                      return (
                        <div className={`${card} flex items-center gap-2.5 py-3 pr-2 pl-1.5 ${r.status !== "published" ? "opacity-90" : ""}`}>
                          {canReorder ? handle() : <span className="w-2" />}
                          <Link href={editHref(r)} className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-2 focus-visible:outline-adm-green">
                            {thumb(r) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb(r)!} alt="" className="h-11 w-11 flex-none rounded-xl bg-adm-ground object-cover" />
                            ) : (
                              <span aria-hidden="true" style={{ background: st.bg, color: st.fg }} className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-[11px] font-extrabold">{st.code}</span>
                            )}
                            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                              <span className="flex flex-wrap items-center gap-1.5">
                                {r.template_key === "kematian" ? (
                                  <span className="rounded-md bg-[#ECECEC] px-1.5 py-0.5 text-[11px] font-extrabold text-[#3A3A3A]">{typeName(r)}</span>
                                ) : (
                                  <span className="text-[12px] font-bold text-adm-muted">{typeName(r)}</span>
                                )}
                                {badges(r)}
                              </span>
                              <span className="truncate text-[15px] font-bold">{title(r)}</span>
                              <span className="text-[12px] text-adm-muted">{meta(r)}</span>
                            </span>
                          </Link>
                          {sw(r)}
                          {moreBtn(r)}
                        </div>
                      );
                    }}
                  </SortableItem>
                ))}
              </ul>
            )}
          </SortableContext>
        </DndContext>
      )}

      {/* Phone: + button above the bottom nav */}
      <Link href={ROUTES.picker} aria-label={t("content.add")} className="fixed right-5 bottom-[98px] z-30 flex h-[60px] w-[60px] items-center justify-center rounded-[20px] bg-adm-green text-white shadow-[0_10px_24px_rgba(20,108,74,0.35)] lg:hidden">
        <Icon d="M12 5v14 M5 12h14" size={28} strokeWidth={2.4} />
      </Link>

      <Dialog open={Boolean(menuFor)} onClose={() => setMenuFor(null)} title={menuFor ? title(menuFor) : ""}>
        {menuFor && (
          <div className="flex flex-col gap-1.5">
            <Link href={editHref(menuFor)} className="flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-bold hover:bg-adm-ground">
              <Icon d="M4 20h4L19 9l-4-4L4 16Z" size={20} /> {t("content.edit")}
            </Link>
            <button type="button" onClick={() => duplicate(menuFor)} className="flex h-12 items-center gap-3 rounded-xl px-3 text-left text-[15px] font-bold hover:bg-adm-ground">
              <Icon d="M8 8h11v11H8z M5 16V5h11" size={20} /> {t("content.duplicate")}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(menuFor);
                setMenuFor(null);
              }}
              className="flex h-12 items-center gap-3 rounded-xl px-3 text-left text-[15px] font-bold text-adm-danger hover:bg-[#FDF3F0]"
            >
              <Icon d={ICON.close} size={20} /> {t("content.delete")}
            </button>
          </div>
        )}
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => !busy && setConfirmDelete(null)} title={confirmDelete ? t("content.deleteTitle", { title: title(confirmDelete) }) : ""}>
        <p className="mb-5 text-[15px] leading-[1.5]">{t("content.deleteBody")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => setConfirmDelete(null)} className="h-[46px] rounded-xl border-[1.5px] border-adm-line bg-white text-[14px] font-bold">
            {t("content.cancel")}
          </button>
          <button type="button" disabled={busy} onClick={() => confirmDelete && remove(confirmDelete)} className="h-[46px] rounded-xl bg-adm-danger text-[14px] font-bold text-white disabled:opacity-60">
            {t("content.deleteConfirm")}
          </button>
        </div>
      </Dialog>
      {toasts}
    </>
  );


}

/** Desktop header actions (AdminShell). */
export function ContentActions() {
  const { t } = useT();
  return (
    <>
      <Link href={ROUTES.poster} className="flex h-11 items-center rounded-xl border-[1.5px] border-adm-green bg-white px-4 text-[14px] font-bold text-adm-green">
        {t("content.newPoster")}
      </Link>
      <Link href={ROUTES.picker} className="flex h-11 items-center rounded-xl bg-adm-green px-4 text-[14px] font-bold text-white hover:bg-adm-green-dark">
        {t("content.newAnnouncement")}
      </Link>
    </>
  );
}


interface HandleBits {
  setActivatorNodeRef: (el: HTMLElement | null) => void;
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
}

/** A sortable row; the drag starts only from its handle, so tapping and scrolling still work. */
function SortableItem({ id, disabled, as = "div", children }: { id: string; disabled: boolean; as?: "div" | "li"; children: (bits: HandleBits) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const Tag = as;
  return (
    <Tag ref={setNodeRef as never} style={{ transform: CSS.Transform.toString(transform), transition, position: "relative", zIndex: isDragging ? 20 : undefined, opacity: isDragging ? 0.85 : undefined }}>
      {children({ setActivatorNodeRef, attributes, listeners })}
    </Tag>
  );
}

/** Drag handle (touch: hold briefly; mouse: drag; keyboard: Space + arrows) and up/down buttons that appear on keyboard focus. */
function Handle({ bits, label, upLabel, downLabel, disabled, first, last, onUp, onDown }: { bits: HandleBits; label: string; upLabel: string; downLabel: string; disabled: boolean; first: boolean; last: boolean; onUp: () => void; onDown: () => void }) {
  return (
    <span className="relative flex flex-col items-center">
      <button
        ref={bits.setActivatorNodeRef}
        type="button"
        {...bits.attributes}
        {...bits.listeners}
        aria-label={label}
        disabled={disabled}
        className="flex h-11 w-8 touch-none items-center justify-center rounded-lg text-[#8DA096] hover:text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-green disabled:opacity-30 lg:cursor-grab"
      >
        <Icon d={GRIP} size={20} strokeWidth={3} />
      </button>
      {!disabled && (
        <>
          <button type="button" onClick={onUp} disabled={first} className="sr-only rounded-lg bg-white px-2 py-1 text-[12px] font-bold whitespace-nowrap focus:not-sr-only focus:absolute focus:top-11 focus:left-0 focus:z-30 focus:shadow">
            {upLabel}
          </button>
          <button type="button" onClick={onDown} disabled={last} className="sr-only rounded-lg bg-white px-2 py-1 text-[12px] font-bold whitespace-nowrap focus:not-sr-only focus:absolute focus:top-11 focus:left-0 focus:z-30 focus:shadow">
            {downLabel}
          </button>
        </>
      )}
    </span>
  );
}
