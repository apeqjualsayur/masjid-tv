"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useT } from "@/admin/i18n";
import { ROUTES } from "@/admin/routing";
import { useAdmin } from "@/admin/session";
import { SimplePage } from "@/admin/SimplePage";
import { AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

// designs/admin/Pending: status of each registration that is not active yet.
export default function MenungguPage() {
  const ok = useGuard();
  const a = useAdmin();
  const { t } = useT();
  const router = useRouter();
  const waiting = a.orgs.filter((o) => o.status !== "active");
  useEffect(() => {
    if (ok && a.orgs.some((o) => o.status === "active")) router.replace(ROUTES.home);
  }, [ok, a.orgs, router]);
  if (!ok) return <AdminStatus />;
  return (
    <SimplePage title={t("pending.title")}>
      <ul className="flex flex-col gap-3">
        {waiting.map((o) => (
          <li key={o.orgId} className="flex flex-col gap-1.5 rounded-[18px] bg-adm-card p-5 shadow-[0_1px_3px_rgba(18,38,30,0.08)]">
            <span className="text-[13px] font-bold text-adm-muted">{t(`status.${o.status}`)}</span>
            <span className="text-[15px]">
              {o.status === "pending" ? t("pending.body", { name: o.fullName }) : o.status === "rejected" ? t("pending.rejected", { name: o.fullName }) : t("pending.suspended", { name: o.fullName })}
            </span>
            {o.statusReason && o.status !== "pending" && <span className="text-[14px] text-adm-muted">{t("pending.reason", { reason: o.statusReason })}</span>}
          </li>
        ))}
      </ul>
    </SimplePage>
  );
}