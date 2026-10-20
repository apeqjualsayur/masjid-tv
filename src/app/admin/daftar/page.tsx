"use client";
import { useT } from "@/admin/i18n";
import { SimplePage } from "@/admin/SimplePage";
import { AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

// Registration form arrives with the next Phase 2 prompt (designs/admin/Register).
export default function DaftarPage() {
  const ok = useGuard();
  const { t } = useT();
  if (!ok) return <AdminStatus />;
  return (
    <SimplePage title={t("register.title")}>
      <p className="rounded-[18px] bg-adm-card p-5 text-[15px] text-adm-muted shadow-[0_1px_3px_rgba(18,38,30,0.08)]">{t("placeholder.soon")}</p>
    </SimplePage>
  );
}