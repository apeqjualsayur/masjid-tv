"use client";
import { useT } from "@/admin/i18n";
import { MembersView } from "@/admin/members/MembersView";
import { AdminShell, AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

// Ahli: the 2 equal admin slots (PRD Phase 2 §3 v0.3). Phone: from Tetapan; computer: sidebar.
export default function AhliPage() {
  const ok = useGuard({ org: true });
  const { t } = useT();
  if (!ok) return <AdminStatus />;
  return (
    <AdminShell title={t("members.title")}>
      <MembersView />
    </AdminShell>
  );
}