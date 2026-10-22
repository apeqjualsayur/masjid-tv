"use client";
import { EditorView } from "@/admin/editor/EditorView";
import { AdminShell, AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

// designs/admin/Editor (phone) and D-Editor (computer). ?key=kuliah (new) or ?id=<slide> (edit).
export default function TemplatPage() {
  const ok = useGuard({ org: true });
  if (!ok) return <AdminStatus />;
  return (
    <AdminShell>
      <EditorView />
    </AdminShell>
  );
}