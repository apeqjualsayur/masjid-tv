"use client";
// Signed-in pages without a masjid yet (Daftar, Menunggu): logo, language, sign out, content.
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useT } from "./i18n";
import { ROUTES } from "./routing";
import { useAdmin } from "./session";
import { LangToggle } from "./shell/AdminShell";
import { LogoMark } from "./shell/icons";

export function SimplePage({ title, children }: { title: string; children: ReactNode }) {
  const a = useAdmin();
  const { t } = useT();
  const router = useRouter();
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[640px] flex-col gap-6 px-6 pt-5 pb-10">
      <div className="flex items-center justify-between">
        <LogoMark size={40} />
        <LangToggle />
      </div>
      <h1 className="text-[26px] font-extrabold tracking-[-0.4px]">{title}</h1>
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