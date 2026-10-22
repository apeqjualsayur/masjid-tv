"use client";
// Signed-in pages without a masjid yet (Daftar, Menunggu): logo, language, sign out, content.
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useT } from "./i18n";
import { ROUTES } from "./routing";
import { useAdmin } from "./session";
import { LangToggle } from "./shell/AdminShell";
import { ICON, Icon, LogoMark } from "./shell/icons";

export function SimplePage({ title, children, back, aside, progress }: { title: string; children: ReactNode; back?: () => void; aside?: string; progress?: number }) {
  const a = useAdmin();
  const { t } = useT();
  const router = useRouter();
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[640px] flex-col gap-6 px-6 pt-5 pb-10">
      <div className="flex items-center justify-between">
        <LogoMark size={40} />
        <LangToggle />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {back && (
            <button type="button" onClick={back} aria-label={t("register.back")} className="-ml-3 flex h-11 w-11 flex-none items-center justify-center rounded-full text-adm-ink hover:bg-adm-hair focus-visible:outline-2 focus-visible:outline-adm-green">
              <Icon d={ICON.chevronLeft} size={22} />
            </button>
          )}
          <h1 className="flex-1 text-[26px] font-extrabold tracking-[-0.4px]">{title}</h1>
          {aside && <span className="text-[13px] font-semibold text-adm-muted">{aside}</span>}
        </div>
        {progress !== undefined && (
          <div aria-hidden="true" className="h-1.5 rounded-full bg-[#DCE7E1]">
            <div className="h-full rounded-full bg-adm-green transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
      </div>
      {children}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-adm-hair pt-4 text-[13px] text-adm-muted">
        <span className="truncate">{a.email}</span>
        <button
          type="button"
          onClick={async () => {
            await a.signOut();
            router.replace(ROUTES.signIn);
          }}
          className="min-h-11 font-bold text-adm-danger"
        >
          {t("account.signOut")}
        </button>
      </div>
    </div>
  );
}