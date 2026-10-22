"use client";
// Small toasts for save results: success fades after 3.5 s, errors stay until dismissed.
// Sits above the phone bottom nav; bottom-right on computer.
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { ICON, Icon } from "./icons";

export type ToastKind = "ok" | "warn" | "error";
interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}

export function useToasts() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const dismiss = useCallback((id: number) => {
    setItems((l) => l.filter((x) => x.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);
  const toast = useCallback(
    (kind: ToastKind, text: string) => {
      const id = next.current++;
      setItems((l) => [...l.slice(-2), { id, kind, text }]);
      if (kind === "ok") timers.current.set(id, setTimeout(() => dismiss(id), 3500));
    },
    [dismiss],
  );
  const clear = useCallback(() => {
    timers.current.forEach((x) => clearTimeout(x));
    timers.current.clear();
    setItems([]);
  }, []);
  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);
  return { toast, clear, node: <Toasts items={items} onDismiss={dismiss} /> };
}

const tone: Record<ToastKind, string> = {
  ok: "bg-adm-ink text-white",
  warn: "bg-[#FFF4DF] text-[#6B4A12] ring-1 ring-[#F0D9A8]",
  error: "bg-[#FDECE8] text-adm-danger ring-1 ring-[#F0C4B8]",
};

function Toasts({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  const { t } = useT();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[94px] z-[45] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:right-8 lg:bottom-8 lg:items-end">
      {items.map((x) => (
        <div
          key={x.id}
          role={x.kind === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex w-full max-w-[440px] items-start gap-3 rounded-[14px] px-4 py-3 text-[14px] font-semibold shadow-[0_6px_24px_rgba(18,38,30,0.18)] ${tone[x.kind]}`}
        >
          <span className="flex-1 leading-[1.45]">{x.text}</span>
          <button type="button" onClick={() => onDismiss(x.id)} aria-label={t("settings.dismiss")} className="-my-1 -mr-2 flex h-8 w-8 flex-none items-center justify-center rounded-full opacity-80 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current">
            <Icon d={ICON.close} size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}