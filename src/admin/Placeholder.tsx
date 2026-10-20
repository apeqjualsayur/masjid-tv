"use client";
// Pages built in later Phase 2 prompts. They already sit behind the right guard.
import Link from "next/link";
import { useT } from "./i18n";
import { ROUTES } from "./routing";
import { AdminShell, AdminStatus } from "./shell/AdminShell";
import { useGuard, type GuardNeeds } from "./shell/guard";

export function PlaceholderPage({ titleKey, needs }: { titleKey: string; needs: GuardNeeds }) {
  const ok = useGuard({ org: true, ...needs });
  const { t } = useT();
  if (!ok) return <AdminStatus />;
  return (
    <AdminShell title={t(titleKey)}>
      <h1 className="text-[22px] font-extrabold lg:hidden">{t(titleKey)}</h1>
      <div className="rounded-[18px] bg-adm-card p-5 text-[15px] text-adm-muted shadow-[0_1px_3px_rgba(18,38,30,0.08)]">
        <p>{t("placeholder.soon")}</p>
        <Link href={ROUTES.home} className="mt-3 inline-flex min-h-11 items-center font-bold text-adm-green">
          {t("placeholder.back")}
        </Link>
      </div>
    </AdminShell>
  );
}