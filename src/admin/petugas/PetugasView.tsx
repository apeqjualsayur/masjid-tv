"use client";
// Petugas (PRD enhancements §6.2): Senarai = the masjid's imam / bilal names (max 40, drag to reorder);
// Jadual = who leads each day (sepanjang hari), with optional per-waktu exceptions, saved in one
// roster_save call. The TV builds the Jadual Imam & Bilal slide from this (never from a fetch).
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PrayerKey } from "@/core";
import { getSupabase } from "@/lib/supabase";
import { resolveTemplateKey } from "@/templates";
import { useT } from "../i18n";
import { ROUTES } from "../routing";
import { useAdmin } from "../session";
import { Dialog } from "../shell/Dialog";
import { ICON, Icon } from "../shell/icons";
import { useToasts, type ToastKind } from "../shell/Toast";
import { useIsDesktop } from "../shell/useIsDesktop";
import {
  DAYS, JUMAAT, MAX_PETUGAS, NAME_MAX, ROLES, TITLE_MAX, TITLE_SUGGESTIONS, WAKTU, WEEKDAYS,
  byOrder, clearDay, copyDay, displayName, emptyGrid, gridFromSlots, gridToSlots, gridsEqual, hasExceptions, optionsFor, petugasErrorKey, petugasPayload, removedRoles, reorderUpdates, setSlot, validatePetugas,
  type Grid, type Petugas, type PetugasErrors, type PetugasForm, type Role, type SlotRow,
} from "./logic";

const card = "rounded-[16px] bg-adm-card shadow-[0_1px_3px_rgba(18,38,30,0.08)]";
const input = "h-12 w-full min-w-0 rounded-xl border bg-white px-3 text-[16px] text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-green";
const GRIP = "M9 6h.01 M15 6h.01 M9 12h.01 M15 12h.01 M9 18h.01 M15 18h.01";
type Tab = "senarai" | "jadual";
type Toast = (kind: ToastKind, text: string) => void;

function usePetugasData(orgId: string) {
  const [list, setList] = useState<Petugas[] | null>(null);
  const [slots, setSlots] = useState<SlotRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const sb = getSupabase();
    const [p, s] = await Promise.all([
      sb.from("petugas").select("id, name, title, roles, active, sort_order").eq("org_id", orgId),
      sb.from("roster_slots").select("day_of_week, waktu, role, petugas_id").eq("org_id", orgId),
    ]);
    const e = p.error ?? s.error;
    if (e) return setError(e.message);
    setError(null);
    setList(((p.data ?? []) as Petugas[]).sort(byOrder));
    setSlots((s.data ?? []) as SlotRow[]);
  }, [orgId]);
  useEffect(() => {
    load();
  }, [load]);
  return { list, slots, error, reload: load, setList };
}

/** `tabParam` = ?tab= (senarai | jadual). */
export function PetugasView({ tabParam }: { tabParam: string | null }) {
  const a = useAdmin();
  const { t } = useT();
  const { toast, node: toasts } = useToasts();
  const orgId = a.current!.orgId;
  const data = usePetugasData(orgId);
  const [tab, setTab] = useState<Tab>(tabParam === "jadual" ? "jadual" : "senarai");
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState<Tab | null>(null);
  const choose = (k: Tab) => {
    if (k === tab) return;
    if (dirty && tab === "jadual") return setLeaving(k);
    setTab(k);
    window.history.replaceState(null, "", `?tab=${k}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[26px] font-extrabold tracking-[-0.3px] lg:hidden">{t("petugas.title")}</h1>
      <p className="max-w-[760px] text-[14px] leading-[1.5] text-adm-muted">{t("petugas.intro")}</p>
      <div role="tablist" aria-label={t("petugas.title")} className="grid grid-cols-2 rounded-[14px] bg-[#E3ECE7] p-1 lg:w-[420px]">
        {(["senarai", "jadual"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => choose(k)} className={`h-11 rounded-[11px] text-[15px] font-bold focus-visible:outline-2 focus-visible:outline-adm-green ${tab === k ? "bg-white text-adm-ink shadow-[0_1px_3px_rgba(18,38,30,0.12)]" : "text-adm-muted"}`}>
            {t(`petugas.tab.${k}`)}
          </button>
        ))}
      </div>
      {data.error && <p role="alert" className="rounded-xl bg-[#FDECE8] px-4 py-3 text-[14px] text-adm-danger">{t("petugas.loadError", { message: data.error })}</p>}
      {!data.list || !data.slots ? (
        !data.error && <p className={`${card} p-5 text-[14px] text-adm-muted`}>{t("app.loading")}</p>
      ) : tab === "senarai" ? (
        <SenaraiTab orgId={orgId} list={data.list} setList={data.setList} reload={data.reload} toast={toast} />
      ) : (
        <JadualTab orgId={orgId} list={data.list} slots={data.slots} reload={data.reload} toast={toast} onDirty={setDirty} onGoList={() => choose("senarai")} />
      )}
      <Dialog open={Boolean(leaving)} onClose={() => setLeaving(null)} title={t("petugas.unsavedTitle")}>
        <p className="mb-5 text-[15px] leading-[1.5]">{t("petugas.unsavedBody")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setLeaving(null)} className="h-[46px] rounded-xl border-[1.5px] border-adm-line bg-white text-[14px] font-bold">{t("petugas.stay")}</button>
          <button
            type="button"
            onClick={() => {
              const k = leaving!;
              setLeaving(null);
              setDirty(false);
              setTab(k);
              window.history.replaceState(null, "", `?tab=${k}`);
            }}
            className="h-[46px] rounded-xl bg-adm-danger text-[14px] font-bold text-white"
          >
            {t("petugas.discard")}
          </button>
        </div>
      </Dialog>
      {toasts}
    </div>
  );
}

// ------------------------------------------------------------------ Senarai

function SenaraiTab({ orgId, list, setList, reload, toast }: { orgId: string; list: Petugas[]; setList: (l: Petugas[]) => void; reload: () => Promise<void>; toast: Toast }) {
  const { t } = useT();
  const [editing, setEditing] = useState<Petugas | "new" | null>(null);
  const full = list.length >= MAX_PETUGAS;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const saveOrder = async (ids: string[]) => {
    const before = list;
    const updates = reorderUpdates(list, ids);
    if (!updates.length) return;
    setList(ids.map((id, i) => ({ ...list.find((p) => p.id === id)!, sort_order: i + 1 })));
    const sb = getSupabase();
    const results = await Promise.all(updates.map((u) => sb.from("petugas").update({ sort_order: u.sort_order }).eq("id", u.id)));
    const e = results.find((r) => r.error)?.error;
    if (e) {
      setList(before);
      toast("error", t(petugasErrorKey(e)!, { message: e.message }));
    } else toast("ok", t("petugas.reordered"));
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length) return;
    const ids = list.map((p) => p.id);
    const [x] = ids.splice(from, 1);
    ids.splice(to, 0, x);
    saveOrder(ids);
  };
  const onDragEnd = (ev: DragEndEvent) => {
    if (!ev.over || ev.active.id === ev.over.id) return;
    const ids = list.map((p) => p.id);
    move(ids.indexOf(String(ev.active.id)), ids.indexOf(String(ev.over.id)));
  };
  const toggleActive = async (p: Petugas) => {
    setList(list.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x)));
    const { error } = await getSupabase().from("petugas").update({ active: !p.active }).eq("id", p.id);
    if (error) {
      setList(list);
      toast("error", t(petugasErrorKey(error)!, { message: error.message }));
    } else toast("ok", t(p.active ? "petugas.deactivated" : "petugas.activated", { name: displayName(p) }));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={full} onClick={() => setEditing("new")} className="h-11 rounded-xl bg-adm-green px-4 text-[14px] font-bold text-white hover:bg-adm-green-dark disabled:opacity-50">
          {t("petugas.add")}
        </button>
        <span className={`text-[13px] font-semibold ${full ? "text-adm-danger" : "text-adm-muted"}`}>{t("petugas.count", { n: list.length, max: MAX_PETUGAS })}</span>
        {list.length > 1 && <span className="text-[13px] text-adm-muted lg:ml-auto">{t("petugas.dragHint")}</span>}
      </div>
      {list.length === 0 ? (
        <p className={`${card} p-5 text-[14px] leading-[1.5] text-adm-muted`}>{t("petugas.empty")}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={list.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2 lg:max-w-[760px]">
              {list.map((p, i) => (
                <SortableRow key={p.id} id={p.id}>
                  {(handle) => (
                    <div className={`${card} flex items-center gap-2.5 py-2.5 pr-2 pl-1.5 ${p.active ? "" : "opacity-70"}`}>
                      {handle}
                      <span className="flex flex-col">
                        <button type="button" aria-label={t("petugas.moveUp", { name: displayName(p) })} disabled={i === 0} onClick={() => move(i, i - 1)} className="flex h-6 w-8 items-center justify-center text-adm-muted disabled:opacity-25">
                          <Icon d="M7 14l5-5 5 5" size={16} />
                        </button>
                        <button type="button" aria-label={t("petugas.moveDown", { name: displayName(p) })} disabled={i === list.length - 1} onClick={() => move(i, i + 1)} className="flex h-6 w-8 items-center justify-center text-adm-muted disabled:opacity-25">
                          <Icon d={ICON.chevronDown} size={16} />
                        </button>
                      </span>
                      <button type="button" onClick={() => setEditing(p)} className="flex min-w-0 flex-1 flex-col items-start gap-1 rounded-lg py-1 text-left focus-visible:outline-2 focus-visible:outline-adm-green">
                        <span className="truncate text-[16px] font-bold">{displayName(p)}</span>
                        <span className="flex flex-wrap gap-1.5">
                          {ROLES.filter((r) => p.roles.includes(r)).map((r) => (
                            <span key={r} className="rounded-md bg-adm-soft px-1.5 py-0.5 text-[11px] font-extrabold text-adm-green-dark">{t(`petugas.role.${r}`)}</span>
                          ))}
                          {!p.active && <span className="rounded-md bg-[#E3ECE7] px-1.5 py-0.5 text-[11px] font-extrabold text-[#3A4E45]">{t("petugas.inactive")}</span>}
                        </span>
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={p.active}
                        aria-label={t("petugas.activeOf", { name: displayName(p) })}
                        onClick={() => toggleActive(p)}
                        className={`relative h-7 w-[46px] flex-none rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green ${p.active ? "bg-adm-green" : "bg-[#C3D1CA]"}`}
                      >
                        <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-[left] ${p.active ? "left-[21px]" : "left-[3px]"}`} />
                      </button>
                    </div>
                  )}
                </SortableRow>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {editing && (
        <PetugasSheet
          orgId={orgId}
          p={editing === "new" ? null : editing}
          nextOrder={Math.max(0, ...list.map((x) => x.sort_order)) + 1}
          onClose={() => setEditing(null)}
          onDone={(text) => {
            setEditing(null);
            toast("ok", text);
            reload();
          }}
          toast={toast}
        />
      )}
    </div>
  );
}

function SortableRow({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { t } = useT();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} aria-label={t("petugas.drag")} className="flex h-11 w-7 flex-none touch-none items-center justify-center rounded-lg text-[#8DA096] hover:text-adm-ink lg:cursor-grab">
      <Icon d={GRIP} size={20} strokeWidth={3} />
    </button>
  );
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, position: "relative", zIndex: isDragging ? 20 : undefined, opacity: isDragging ? 0.85 : undefined }}>
      {children(handle)}
    </li>
  );
}

function PetugasSheet({ orgId, p, nextOrder, onClose, onDone, toast }: { orgId: string; p: Petugas | null; nextOrder: number; onClose: () => void; onDone: (text: string) => void; toast: Toast }) {
  const { t } = useT();
  const [f, setF] = useState<PetugasForm>(() => ({ name: p?.name ?? "", title: p?.title ?? "", roles: p?.roles ?? ["imam"], active: p?.active ?? true }));
  const [errors, setErrors] = useState<PetugasErrors>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const removed = p ? removedRoles(p.roles, f.roles) : [];
  const toggleRole = (r: Role) => setF({ ...f, roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r] });

  const save = async () => {
    const e = validatePetugas(f);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const sb = getSupabase();
    const res = p ? await sb.from("petugas").update(petugasPayload(f)).eq("id", p.id) : await sb.from("petugas").insert({ org_id: orgId, sort_order: nextOrder, ...petugasPayload(f) });
    setBusy(false);
    if (res.error) return toast("error", t(petugasErrorKey(res.error)!, { message: res.error.message }));
    onDone(t(p ? "petugas.saved" : "petugas.added", { name: displayName({ name: f.name.trim(), title: f.title.trim() || null }) }));
  };
  const remove = async () => {
    if (!p) return;
    setBusy(true);
    const { error } = await getSupabase().from("petugas").delete().eq("id", p.id);
    setBusy(false);
    if (error) return toast("error", t(petugasErrorKey(error)!, { message: error.message }));
    onDone(t("petugas.deleted", { name: displayName(p) }));
  };

  if (confirmDelete && p) {
    return (
      <Dialog open onClose={() => !busy && setConfirmDelete(false)} title={t("petugas.deleteTitle", { name: displayName(p) })}>
        <p className="mb-5 text-[15px] leading-[1.5]">{t("petugas.deleteBody")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => setConfirmDelete(false)} className="h-[46px] rounded-xl border-[1.5px] border-adm-line bg-white text-[14px] font-bold">{t("content.cancel")}</button>
          <button type="button" disabled={busy} onClick={remove} className="h-[46px] rounded-xl bg-adm-danger text-[14px] font-bold text-white disabled:opacity-60">{t("petugas.delete")}</button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={() => !busy && onClose()} title={p ? t("petugas.editTitle") : t("petugas.addTitle")}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pt-name" className="text-[13px] font-bold text-[#3A4E45]">{t("petugas.name")}</label>
          <input id="pt-name" value={f.name} maxLength={NAME_MAX} onChange={(e) => setF({ ...f, name: e.target.value })} aria-invalid={Boolean(errors.name)} className={`${input} ${errors.name ? "border-adm-danger" : "border-adm-line"}`} />
          {errors.name && <p className="text-[13px] font-semibold text-adm-danger">{t(`petugas.err.name.${errors.name}`)}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pt-title" className="text-[13px] font-bold text-[#3A4E45]">{t("petugas.titleLabel")}</label>
          <input id="pt-title" value={f.title} maxLength={TITLE_MAX} list="pt-titles" onChange={(e) => setF({ ...f, title: e.target.value })} aria-invalid={Boolean(errors.title)} className={`${input} ${errors.title ? "border-adm-danger" : "border-adm-line"}`} />
          <datalist id="pt-titles">
            {TITLE_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <div className="flex flex-wrap gap-1.5">
            {TITLE_SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setF({ ...f, title: s })} aria-pressed={f.title === s} className={`min-h-9 rounded-full border px-3 text-[13px] font-semibold ${f.title === s ? "border-adm-green bg-adm-soft text-adm-green-dark" : "border-adm-line bg-white"}`}>
                {s}
              </button>
            ))}
          </div>
          {errors.title && <p className="text-[13px] font-semibold text-adm-danger">{t("petugas.err.title", { max: TITLE_MAX })}</p>}
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[13px] font-bold text-[#3A4E45]">{t("petugas.roles")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <label key={r} className="flex min-h-12 items-center gap-3 rounded-xl border border-adm-line bg-white px-3 text-[15px] font-semibold">
                <input type="checkbox" checked={f.roles.includes(r)} onChange={() => toggleRole(r)} className="h-5 w-5 accent-[#146C4A]" />
                {t(`petugas.role.${r}`)}
              </label>
            ))}
          </div>
          {errors.roles && <p className="text-[13px] font-semibold text-adm-danger">{t("petugas.err.roles")}</p>}
          {removed.length > 0 && <p role="status" className="rounded-xl bg-[#FFF4DF] px-3 py-2.5 text-[13px] leading-[1.45] text-[#6B4A12]">{t("petugas.roleRemoved", { role: removed.map((r) => t(`petugas.role.${r}`)).join(", ") })}</p>}
        </fieldset>
        <label className="flex min-h-12 items-center justify-between gap-3 text-[15px] font-semibold">
          {t("petugas.active")}
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="h-5 w-5 accent-[#146C4A]" />
        </label>
        <button type="submit" disabled={busy} className="h-[52px] rounded-[14px] bg-adm-green text-[15px] font-bold text-white hover:bg-adm-green-dark disabled:opacity-60">
          {busy ? t("editor.saving") : p ? t("petugas.save") : t("petugas.addButton")}
        </button>
        {p && (
          <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)} className="h-11 text-[14px] font-bold text-adm-danger">
            {t("petugas.delete")}
          </button>
        )}
      </form>
    </Dialog>
  );
}

// ------------------------------------------------------------------ Jadual

function JadualTab({ orgId, list, slots, reload, toast, onDirty, onGoList }: {
  orgId: string; list: Petugas[]; slots: SlotRow[]; reload: () => Promise<void>; toast: Toast; onDirty: (d: boolean) => void; onGoList: () => void;
}) {
  const { t } = useT();
  const desktop = useIsDesktop();
  const saved = useMemo(() => gridFromSlots(slots), [slots]);
  const [grid, setGrid] = useState<Grid>(saved);
  const [open, setOpen] = useState<Set<number>>(() => new Set(DAYS.filter((d) => hasExceptions(saved[d]))));
  const [busy, setBusy] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const dirty = !gridsEqual(grid, saved);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  // Leaving the page with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const hasImam = list.some((p) => p.active && p.roles.includes("imam"));
  const hasBilal = list.some((p) => p.active && p.roles.includes("bilal"));
  const dayName = (d: number) => t(`petugas.day.${d}`);
  const waktuName = (d: number, w: PrayerKey) => (w === "zohor" && d === JUMAAT ? t("petugas.waktu.zohorJumaat") : t(`petugas.waktu.${w}`));

  const save = async () => {
    setBusy(true);
    const { error } = await getSupabase().rpc("roster_save", { p_org: orgId, p_slots: gridToSlots(grid) });
    setBusy(false);
    if (error) return toast("error", t(petugasErrorKey(error)!, { message: error.message }));
    toast("ok", t("petugas.rosterSaved"));
    await reload();
    // First roster and no Jadual Imam & Bilal slide yet: offer to show it on the TV (once the template exists).
    if (resolveTemplateKey("jadual_petugas")) {
      const { count } = await getSupabase().from("slides").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("template_key", "jadual_petugas");
      setShowCta((count ?? 0) === 0);
    }
  };

  const select = (d: number, w: PrayerKey | null, role: Role) => {
    const value = w === null ? grid[d].all[role] : grid[d].waktu[w][role];
    const opts = optionsFor(list, role, value);
    const label = `${dayName(d)}${w ? ` · ${waktuName(d, w)}` : ""}: ${t(`petugas.role.${role}`)}`;
    return (
      <select aria-label={label} value={value ?? ""} onChange={(e) => setGrid(setSlot(grid, d, w, role, e.target.value || null))} className={`${input} h-11 border-adm-line text-[15px]`}>
        <option value="">{w ? t("petugas.followsDay") : "—"}</option>
        {opts.map((o) => (
          <option key={o.id} value={o.id}>{o.inactive ? t("petugas.inactiveOption", { name: o.label }) : o.label}</option>
        ))}
      </select>
    );
  };
  const toggleOpen = (d: number) => setOpen((s) => {
    const n = new Set(s);
    if (n.has(d)) n.delete(d);
    else n.add(d);
    return n;
  });
  const dayActions = (d: number) => (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      <button type="button" onClick={() => setGrid(copyDay(grid, d, DAYS))} className="h-10 px-1 text-[13px] font-bold text-adm-green">{t("petugas.copyAll")}</button>
      <button type="button" onClick={() => setGrid(copyDay(grid, d, WEEKDAYS))} className="h-10 px-1 text-[13px] font-bold text-adm-green">{t("petugas.copyWeekdays")}</button>
      <button type="button" onClick={() => setGrid(clearDay(grid, d))} className="h-10 px-1 text-[13px] font-bold text-adm-danger">{t("petugas.clearDay")}</button>
    </div>
  );
  const waktuRows = (d: number) => (
    <div className="flex flex-col gap-2 rounded-xl bg-[#F7FAF8] p-3">
      <p className="text-[12px] leading-[1.4] text-adm-muted">{t("petugas.waktuHint")}</p>
      {WAKTU.map((w) => (
        <div key={w} className="grid grid-cols-[96px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 lg:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)]">
          <span className="text-[14px] font-semibold">{waktuName(d, w)}</span>
          {select(d, w, "imam")}
          {select(d, w, "bilal")}
        </div>
      ))}
    </div>
  );

  if (!hasImam && !hasBilal) {
    return (
      <div className={`${card} flex flex-col items-start gap-3 p-5`}>
        <p className="text-[15px] leading-[1.5]">{t("petugas.needPetugas")}</p>
        <button type="button" onClick={onGoList} className="h-11 rounded-xl bg-adm-green px-4 text-[14px] font-bold text-white">{t("petugas.goList")}</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-24 lg:pb-4">
      {showCta && (
        <div className="flex flex-wrap items-center gap-3 rounded-[16px] bg-adm-soft p-4">
          <span className="text-[15px] font-semibold text-adm-green-dark">{t("petugas.ctaText")}</span>
          <Link href={`${ROUTES.template}?key=jadual_petugas`} className="flex h-11 items-center rounded-xl bg-adm-green px-4 text-[14px] font-bold text-white">{t("petugas.cta")}</Link>
        </div>
      )}
      {desktop ? (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[860px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-adm-hair text-[12px] font-bold text-adm-muted">
                <th scope="col" className="w-[150px] px-4 py-3">{t("petugas.col.day")}</th>
                <th scope="col" className="px-4 py-3">{t("petugas.role.imam")}</th>
                <th scope="col" className="px-4 py-3">{t("petugas.role.bilal")}</th>
                <th scope="col" className="w-[230px] px-4 py-3"><span className="sr-only">{t("petugas.col.actions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map((d) => (
                <DayRowDesktop key={d} title={dayName(d)} exceptions={hasExceptions(grid[d])} open={open.has(d)} onToggle={() => toggleOpen(d)} imam={select(d, null, "imam")} bilal={select(d, null, "bilal")} actions={dayActions(d)} waktu={waktuRows(d)} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {DAYS.map((d) => (
            <li key={d} className={`${card} flex flex-col gap-3 p-3.5`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[17px] font-extrabold">{dayName(d)}</span>
                {hasExceptions(grid[d]) && <span className="rounded-md bg-adm-soft px-1.5 py-0.5 text-[11px] font-extrabold text-adm-green-dark">{t("petugas.byWaktu")}</span>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[12px] font-bold text-adm-muted">{t("petugas.role.imam")}{select(d, null, "imam")}</label>
                <label className="flex flex-col gap-1 text-[12px] font-bold text-adm-muted">{t("petugas.role.bilal")}{select(d, null, "bilal")}</label>
              </div>
              <button type="button" aria-expanded={open.has(d)} onClick={() => toggleOpen(d)} className="flex h-10 items-center gap-1.5 self-start text-[14px] font-bold text-adm-green">
                <Icon d={ICON.chevronDown} size={18} className={open.has(d) ? "rotate-180" : ""} />
                {t("petugas.setByWaktu")}
              </button>
              {open.has(d) && waktuRows(d)}
              {dayActions(d)}
            </li>
          ))}
        </ul>
      )}

      <div className="sticky bottom-[86px] z-10 flex items-center gap-3 rounded-[14px] bg-white p-3 shadow-[0_-1px_8px_rgba(18,38,30,0.10)] lg:bottom-4">
        <span className={`flex-1 text-[13px] font-semibold ${dirty ? "text-[#7A4700]" : "text-adm-muted"}`}>{dirty ? t("petugas.unsaved") : t("petugas.savedState")}</span>
        {dirty && <button type="button" disabled={busy} onClick={() => setGrid(saved)} className="h-11 px-3 text-[14px] font-bold text-adm-muted">{t("petugas.undo")}</button>}
        <button type="button" disabled={busy || !dirty} onClick={save} className="h-11 rounded-xl bg-adm-green px-5 text-[14px] font-bold text-white hover:bg-adm-green-dark disabled:opacity-50">
          {busy ? t("editor.saving") : t("petugas.saveRoster")}
        </button>
      </div>
    </div>
  );
}

function DayRowDesktop({ title, exceptions, open, onToggle, imam, bilal, actions, waktu }: {
  title: string; exceptions: boolean; open: boolean; onToggle: () => void; imam: ReactNode; bilal: ReactNode; actions: ReactNode; waktu: ReactNode;
}) {
  const { t } = useT();
  return (
    <>
      <tr className="align-top">
        <td className="px-4 py-3">
          <span className="flex flex-col gap-1">
            <span className="text-[15px] font-extrabold">{title}</span>
            {exceptions && <span className="self-start rounded-md bg-adm-soft px-1.5 py-0.5 text-[11px] font-extrabold text-adm-green-dark">{t("petugas.byWaktu")}</span>}
          </span>
        </td>
        <td className="px-4 py-3">{imam}</td>
        <td className="px-4 py-3">{bilal}</td>
        <td className="px-4 py-3">
          <button type="button" aria-expanded={open} onClick={onToggle} className="flex h-10 items-center gap-1.5 text-[13px] font-bold text-adm-green">
            <Icon d={ICON.chevronDown} size={18} className={open ? "rotate-180" : ""} />
            {t("petugas.setByWaktu")}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-adm-hair">
          <td />
          <td colSpan={3} className="px-4 pb-3">
            <div className="flex flex-col gap-2">
              {waktu}
              {actions}
            </div>
          </td>
        </tr>
      )}
      {!open && (
        <tr className="border-b border-adm-hair">
          <td />
          <td colSpan={3} className="px-4 pb-2">{actions}</td>
        </tr>
      )}
    </>
  );
}
