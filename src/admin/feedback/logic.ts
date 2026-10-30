// Maklum balas (owner request 2026-10-30): admins send feedback to the platform owner; no replies.
// Pure: no React, no Supabase. The server checks the same limits (migration 0010 send_feedback).

export const FEEDBACK_MAX = 2000;

/** i18n key for a problem with the typed message, or null. */
export function feedbackError(message: string): string | null {
  const m = message.trim();
  if (!m) return "feedback.err.empty";
  if ([...m].length > FEEDBACK_MAX) return "feedback.err.tooLong";
  return null;
}

/** send_feedback errors → i18n key. */
export function sendErrorKey(error: { message?: string; code?: string } | null): string | null {
  if (!error) return null;
  const m = error.message ?? "";
  if (m.includes("too_many")) return "feedback.err.tooMany";
  if (m.includes("too_long")) return "feedback.err.tooLong";
  if (m.includes("empty_message")) return "feedback.err.empty";
  if (m.includes("not_allowed") || error.code === "42501") return "feedback.err.notAllowed";
  if (/failed to fetch|network|load failed/i.test(m)) return "feedback.err.network";
  return "feedback.err.generic";
}

export interface FeedbackRow {
  id: string;
  message: string;
  created_at: string;
}

/** Platform list row (platform_feedback). */
export interface PlatformFeedbackRow extends FeedbackRow {
  page: string | null;
  app_version: string | null;
  org_id: string | null;
  org_name: string | null;
  sender_email: string | null;
}
