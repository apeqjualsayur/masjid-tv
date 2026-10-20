"use client";
// Placeholder privacy notice (PRD §10). Full BM/EN text to be written before the pilot.
import Link from "next/link";
import { LangProvider, useT } from "@/admin/i18n";
import { ROUTES } from "@/admin/routing";
import { LangToggle } from "@/admin/shell/AdminShell";
import { LogoMark } from "@/admin/shell/icons";

function Privacy() {
  const { t } = useT();
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[640px] flex-col gap-6 px-6 pt-5 pb-10">
      <div className="flex items-center justify-between">
        <LogoMark size={40} />
        <LangToggle />
      </div>
      <h1 className="text-[26px] font-extrabold">{t("privacy.title")}</h1>
      <p className="text-[15px] leading-relaxed text-adm-muted">{t("privacy.draft")}</p>
      <Link href={ROUTES.signIn} className="inline-flex min-h-11 items-center font-bold text-adm-green">
        ← {t("app.name")}
      </Link>
    </div>
  );
}

export default function PrivasiPage() {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-adm-ground font-jakarta text-adm-ink antialiased">
      <LangProvider>
        <Privacy />
      </LangProvider>
    </div>
  );
}