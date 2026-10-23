"use client";
import { PosterView } from "@/admin/poster/PosterView";
import { AdminShell, AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

// designs/admin/Poster (phone) and D-Poster (computer). ?id= edits an existing poster.
export default function PosterPage() {
  const ok = useGuard({ org: true });
  if (!ok) return <AdminStatus />;
  return (
    <AdminShell>
      <PosterView />
    </AdminShell>
  );
}