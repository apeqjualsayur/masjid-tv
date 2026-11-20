// Reading and writing a slide's notice (PRD enhancements §3.2). The row is read fresh before every
// change, so a notice never overwrites other edits; fields, priority and ends_at go in one update
// (one bundle bump). The DB check slides_notice_shape is the last line of defence.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NoticeRow } from "@/templates";

export interface NoticeSlide {
  row: NoticeRow;
  status: string;
}

export async function loadNoticeSlide(sb: SupabaseClient, orgId: string, id: string): Promise<NoticeSlide> {
  const { data, error } = await sb.from("slides").select("fields, priority, ends_at, status").eq("id", id).eq("org_id", orgId).single();
  if (error) throw error;
  const end = data.ends_at ? Date.parse(data.ends_at as string) : NaN;
  return {
    row: { fields: (data.fields as Record<string, unknown>) ?? {}, priority: data.priority === true, endsAt: Number.isFinite(end) ? end : null },
    status: String(data.status),
  };
}

export async function saveNoticeSlide(sb: SupabaseClient, orgId: string, id: string, row: NoticeRow): Promise<void> {
  const { data, error } = await sb
    .from("slides")
    .update({ fields: row.fields, priority: row.priority, ends_at: row.endsAt === null ? null : new Date(row.endsAt).toISOString() })
    .eq("id", id)
    .eq("org_id", orgId)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw Object.assign(new Error("not_allowed"), { code: "42501" });
}

/** i18n key for a failed save: the DB check (reason too long, wrong template) or anything else. */
export const noticeSaveError = (e: unknown): { key: string; message: string } => {
  const code = (e as { code?: string })?.code;
  const message = (e as { message?: string })?.message ?? String(e);
  return code === "23514" ? { key: "notice.err.db", message } : { key: "notice.err.save", message };
};
