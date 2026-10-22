"use client";
import { useEffect } from "react";
import { useT } from "@/admin/i18n";
import { PENDING_PAIR_KEY, codeFromQuery } from "@/admin/screens/logic";
import { AddScreenAction, ScreensView } from "@/admin/screens/ScreensView";
import { AdminShell, AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

// designs/admin/Screens. ?pair=482913 (QR on the TV) opens "Tambah skrin" with the code filled in.
export default function SkrinPage() {
  // Keep a scanned code through sign-in: the guard may send the user to /admin first.
  useEffect(() => {
    const code = codeFromQuery(window.location.search);
    try {
      if (code) sessionStorage.setItem(PENDING_PAIR_KEY, code);
    } catch {}
  }, []);
  const ok = useGuard({ org: true });
  const { t } = useT();
  if (!ok) return <AdminStatus />;
  return (
    <AdminShell title={t("screens.title")} actions={<AddScreenAction />}>
      <ScreensView />
    </AdminShell>
  );
}