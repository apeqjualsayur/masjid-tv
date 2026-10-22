"use client";
import { ContentActions, ContentView } from "@/admin/content/ContentView";
import { useT } from "@/admin/i18n";
import { AdminShell, AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

// designs/admin/Content (phone) and D-Content (computer).
export default function KandunganPage() {
  const ok = useGuard({ org: true });
  const { t } = useT();
  if (!ok) return <AdminStatus />;
  return (
    <AdminShell title={t("content.title")} actions={<ContentActions />}>
      <ContentView />
    </AdminShell>
  );
}