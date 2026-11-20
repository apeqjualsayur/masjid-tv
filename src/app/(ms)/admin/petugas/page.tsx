"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useT } from "@/admin/i18n";
import { PetugasView } from "@/admin/petugas/PetugasView";
import { AdminShell, AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

// PRD enhancements §6.2: imam & bilal list (?tab=senarai) and the weekly roster (?tab=jadual).
function PetugasPage() {
  const ok = useGuard({ org: true });
  const { t } = useT();
  const tab = useSearchParams().get("tab");
  if (!ok) return <AdminStatus />;
  return (
    <AdminShell title={t("petugas.title")}>
      <PetugasView tabParam={tab} />
    </AdminShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<AdminStatus />}>
      <PetugasPage />
    </Suspense>
  );
}
