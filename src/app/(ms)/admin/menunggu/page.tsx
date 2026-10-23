"use client";
import { PendingView } from "@/admin/PendingView";
import { AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

// designs/admin/Pending: status of each registration that is not active yet.
export default function MenungguPage() {
  const ok = useGuard();
  if (!ok) return <AdminStatus />;
  return <PendingView />;
}