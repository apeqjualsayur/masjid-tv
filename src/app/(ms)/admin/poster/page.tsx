"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PosterView } from "@/admin/poster/PosterView";
import { AdminShell, AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

/** ?id= from the router, correct on a client-side navigation too (Kandungan links are <Link>s). */
function PosterFromUrl() {
  const q = useSearchParams();
  return <PosterView editIdParam={q.get("id")} />;
}

// designs/admin/Poster (phone) and D-Poster (computer). ?id= edits an existing poster.
// useSearchParams needs a Suspense boundary in a static export: the loading state shows until the
// query string is available.
export default function PosterPage() {
  const ok = useGuard({ org: true });
  if (!ok) return <AdminStatus />;
  return (
    <AdminShell>
      <Suspense fallback={<AdminStatus />}>
        <PosterFromUrl />
      </Suspense>
    </AdminShell>
  );
}
