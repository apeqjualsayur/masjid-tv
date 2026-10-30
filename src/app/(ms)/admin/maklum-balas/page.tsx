"use client";
import { FeedbackView } from "@/admin/feedback/FeedbackView";
import { useT } from "@/admin/i18n";
import { AdminShell, AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

// Maklum balas: send feedback to the platform owner; see what you sent. Phone: from the account menu.
export default function MaklumBalasPage() {
  const ok = useGuard({ org: true });
  const { t } = useT();
  if (!ok) return <AdminStatus />;
  return (
    <AdminShell title={t("feedback.title")} subtitle={t("feedback.subtitle")}>
      <FeedbackView />
    </AdminShell>
  );
}
