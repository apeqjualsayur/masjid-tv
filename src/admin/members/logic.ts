// Ahli rules (PRD Phase 2 §3 v0.3: up to 2 equal admins, one masjid per account). Pure.

export const MAX_ADMINS = 2;

/** A row of org_members(p_org). */
export interface MemberRow {
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  is_me: boolean;
}

export interface InvitationRow {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export type Slot =
  | { kind: "member"; member: MemberRow }
  | { kind: "invited"; invitation: InvitationRow }
  | { kind: "empty" };

/** Two slots: admins first (oldest first), then the open invitation, then empty. */
export function slots(members: MemberRow[], invitations: InvitationRow[], now: number): Slot[] {
  const sorted = [...members].sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(0, MAX_ADMINS);
  const out: Slot[] = sorted.map((m) => ({ kind: "member", member: m }));
  const open = openInvitation(invitations, now);
  if (out.length < MAX_ADMINS && open) out.push({ kind: "invited", invitation: open });
  while (out.length < MAX_ADMINS) out.push({ kind: "empty" });
  return out;
}

/** The invitation still waiting (not accepted, not expired). Expired ones are cleaned by invite_member. */
export function openInvitation(invitations: InvitationRow[], now: number): InvitationRow | null {
  return invitations.find((i) => !i.accepted_at && Date.parse(i.expires_at) > now) ?? null;
}

/** "Keluar dari masjid ini" only when someone else stays (the last admin cannot leave). */
export const canLeave = (members: MemberRow[]) => members.length >= 2 && members.some((m) => m.is_me);

export const ERROR_CODES = ["user_has_org", "org_full", "invite_pending", "org_not_active", "bad_email", "last_pentadbir", "not_allowed"] as const;

/** i18n key for an error from invite_member / members delete / invitations delete. */
export function memberErrorKey(e: { message?: string; code?: string } | null | undefined): string {
  const m = e?.message ?? "";
  for (const c of ERROR_CODES) if (m.includes(c)) return `members.err.${c}`;
  if (e?.code === "42501") return "members.err.not_allowed";
  if (/failed to fetch|network|load failed/i.test(m)) return "members.err.network";
  return "members.err.generic";
}

/** Light check before calling invite_member (the database checks again). */
export function emailOk(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
}

/** WhatsApp share link for the invitation message. */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}