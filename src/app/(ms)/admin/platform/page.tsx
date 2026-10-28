"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useT } from "@/admin/i18n";
import { PlatformView } from "@/admin/platform/PlatformView";
import { AdminShell, AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

/** ?tab= from the router (pending | active | suspended | penggunaan). */
function PlatformFromUrl() {
  const q = useSearchParams();
  return <PlatformView tabParam={q.get("tab")} />;
}

// designs/admin/Admin + designs/admin/D-Usage (Penggunaan tab). Platform owners only (is_platform_admin);
// the database rejects everyone else too. useSearchParams needs a Suspense boundary in a static export.
export default function PlatformPage() {
  const ok = useGuard({ platform: true });
  const { t } = useT();
  if (!ok) return <AdminStatus />;
  return (
    <AdminShell title={t("platform.title")}>
      <Suspense fallback={<AdminStatus />}>
        <PlatformFromUrl />
      </Suspense>
    </AdminShell>
  );
}
