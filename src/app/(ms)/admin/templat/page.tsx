"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { EditorView } from "@/admin/editor/EditorView";
import { AdminShell, AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

/**
 * ?key= / ?id= from the router, correct on a client-side navigation too (the picker uses <Link>).
 * The editor reads them once when it mounts; its own history.replaceState after a save or a
 * duplicate must not rebuild it.
 */
function EditorFromUrl() {
  const q = useSearchParams();
  return <EditorView templateKey={q.get("key")} slideIdParam={q.get("id")} />;
}

// designs/admin/Editor (phone) and D-Editor (computer). ?key=kuliah (new) or ?id=<slide> (edit).
// useSearchParams needs a Suspense boundary in a static export: the loading state shows until the
// query string is available (never the "Unknown template" error).
export default function TemplatPage() {
  const ok = useGuard({ org: true });
  if (!ok) return <AdminStatus />;
  return (
    <AdminShell>
      <Suspense fallback={<AdminStatus />}>
        <EditorFromUrl />
      </Suspense>
    </AdminShell>
  );
}
