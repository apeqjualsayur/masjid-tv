"use client";
import { useT } from "@/admin/i18n";
import { PlatformView } from "@/admin/platform/PlatformView";
import { AdminShell, AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

// designs/admin/Admin. Platform owners only (is_platform_admin); the database rejects everyone else too.
export default function PlatformPage() {
  const ok = useGuard({ platform: true });
  const { t } = useT();
  if (!ok) return <AdminStatus />;
  return (
    <AdminShell title={t("platform.title")}>
      <PlatformView />
    </AdminShell>
  );
}