"use client";
// Bottom sheet on phone/tablet, centred modal on computer (PRD §5.1). Esc and the backdrop close it.
import { useEffect, useRef, type ReactNode } from "react";
import { useT } from "../i18n";
import { ICON, Icon } from "./icons";
import { useIsDesktop } from "./useIsDesktop";

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { t } = useT();
  const desktop = useIsDesktop();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <div className="absolute inset-0 bg-[rgba(18,38,30,0.45)]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative max-h-[85vh] w-full max-w-[640px] overflow-y-auto rounded-t-[22px] bg-adm-card px-5 pt-3 pb-8 outline-none lg:max-w-[440px] lg:rounded-[20px] lg:p-6"
      >
        {!desktop && <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-adm-line" />}
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t("dialog.close")} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-adm-muted hover:bg-adm-ground focus-visible:outline-2 focus-visible:outline-adm-green">
            <Icon d={ICON.close} size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}