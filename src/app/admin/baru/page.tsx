"use client";
import { PickerView } from "@/admin/editor/PickerView";
import { AdminShell, AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

// designs/admin/Picker: poster or one of the 10 templates.
export default function BaruPage() {
  const ok = useGuard({ org: true });
  if (!ok) return <AdminStatus />;
  return (
    <AdminShell>
      <PickerView />
    </AdminShell>
  );
}