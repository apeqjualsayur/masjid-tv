"use client";
import { RegisterView } from "@/admin/register/RegisterView";
import { AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

// designs/admin/Register: 2 steps (details, then review & submit).
export default function DaftarPage() {
  const ok = useGuard();
  if (!ok) return <AdminStatus />;
  return <RegisterView />;
}