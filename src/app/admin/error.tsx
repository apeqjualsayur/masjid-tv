"use client";
// Admin error boundary (Next.js app router): any crash inside /admin shows a friendly BM/EN message
// instead of a blank page. The error is logged to the console with context, secrets removed.
import Link from "next/link";
import { useEffect } from "react";
import { useT } from "@/admin/i18n";
import { logError } from "@/admin/log";
import { ROUTES } from "@/admin/routing";
import { LogoMark } from "@/admin/shell/icons";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  useEffect(() => {
    logError({ where: "admin.errorBoundary", digest: error.digest }, error);
  }, [error]);
  return (
    <div role="alert" className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <LogoMark size={56} />
      <h1 className="text-[22px] font-extrabold">{t("error.title")}</h1>
      <p className="max-w-[360px] text-[15px] leading-[1.5] text-adm-muted">{t("error.body")}</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        <button type="button" onClick={reset} className="h-11 rounded-xl bg-adm-green px-5 text-[14px] font-bold text-white hover:bg-adm-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green">
          {t("error.retry")}
        </button>
        <Link href={ROUTES.signIn} className="flex h-11 items-center rounded-xl border border-adm-line bg-white px-5 text-[14px] font-bold text-adm-ink hover:bg-adm-ground">
          {t("error.home")}
        </Link>
      </div>
    </div>
  );
}