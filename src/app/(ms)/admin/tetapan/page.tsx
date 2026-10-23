"use client";
import { useT } from "@/admin/i18n";
import { SettingsView } from "@/admin/settings/SettingsView";
import { AdminShell, AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

// designs/admin/Settings. Editors may open it read-only (RLS rejects their changes anyway).
export default function TetapanPage() {
  const ok = useGuard({ org: true });
  const { t } = useT();
  if (!ok) return <AdminStatus />;
  return (
    <AdminShell title={t("settings.title")}>
      <SettingsView />
    </AdminShell>
  );
}