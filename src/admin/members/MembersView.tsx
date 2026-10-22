"use client";
// Ahli (PRD Phase 2 §3 v0.3): the 2 equal admin slots from org_members(), invite the second admin
// (invite_member) with a WhatsApp message, cancel the open invitation, remove the other admin, leave.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useT } from "../i18n";
import { ROUTES } from "../routing";
import { useAdmin } from "../session";
import { Dialog } from "../shell/Dialog";
import { ICON, Icon } from "../shell/icons";
import { useToasts } from "../shell/Toast";
import { canLeave, emailOk, memberErrorKey, openInvitation, slots, whatsappUrl, type InvitationRow, type MemberRow } from "./logic";

const card = "rounded-[18px] bg-adm-card shadow-[0_1px_3px_rgba(18,38,30,0.08)]";
const btnPrimary = "h-11 rounded-xl bg-adm-green px-4 text-[14px] font-bold text-white hover:bg-adm-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-50";

export function MembersView() {
  const a = useAdmin();
  const { t, locale } = useT();
  const router = useRouter();
  const { toast, node: toasts } = useToasts();
  const org = a.current!;
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "remove"; member: MemberRow } | { kind: "leave" } | null>(null);
  const now = Date.now();
  const active = org.status === "active";

  const load = useCallback(async () => {
    const sb = getSupabase();
    const [m, i] = await Promise.all([
      sb.rpc("org_members", { p_org: org.orgId }),
      sb.from("invitations").select("id, email, created_at, expires_at, accepted_at").eq("org_id", org.orgId).is("accepted_at", null),
    ]);
    if (m.error) return setLoadError(m.error.message);
    setLoadError(null);
    setMembers((m.data ?? []) as MemberRow[]);
    setInvitations((i.data ?? []) as InvitationRow[]);
  }, [org.orgId]);
  useEffect(() => {
    load();
  }, [load]);

  const date = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });
  const url = typeof window === "undefined" ? "https://masjidview.my/admin" : `${window.location.origin}/admin`;
  const shareText = (to: string) => t("members.shareText", { masjid: org.fullName, email: to, url });

  const invite = async () => {
    const e = email.trim().toLowerCase();
    if (!emailOk(e)) return setInviteError("members.err.bad_email");
    setBusy(true);
    setInviteError(null);
    const { error } = await getSupabase().rpc("invite_member", { p_org: org.orgId, p_email: e });
    setBusy(false);
    if (error) return setInviteError(memberErrorKey(error));
    setEmail("");
    toast("ok", t("members.invitedTitle"));
    load();
  };

  const cancelInvite = async (inv: InvitationRow) => {
    const { data, error } = await getSupabase().from("invitations").delete().eq("id", inv.id).select("id");
    if (error || !data?.length) return toast("error", t(error ? memberErrorKey(error) : "members.err.not_allowed", { message: error?.message ?? "" }));
    toast("ok", t("members.cancelled"));
    load();
  };

  const removeMember = async (m: MemberRow, self: boolean) => {
    setBusy(true);
    const { data, error } = await getSupabase().from("members").delete().eq("org_id", org.orgId).eq("user_id", m.user_id).select("user_id");
    setBusy(false);
    setConfirm(null);
    if (error || !data?.length) return toast("error", t(error ? memberErrorKey(error) : "members.err.not_allowed", { message: error?.message ?? "" }));
    if (self) {
      await a.refresh();
      router.replace(ROUTES.signIn); // routes to Daftar masjid: this account has no masjid now
      return;
    }
    toast("ok", t("members.removed", { email: m.email }));
    load();
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("ok", t("members.copied"));
    } catch {
      toast("error", t("members.err.generic", { message: "clipboard" }));
    }
  };

  if (loadError) return <p role="alert" className="rounded-xl bg-[#FDECE8] px-4 py-3 text-[14px] text-adm-danger">{t("members.loadError", { message: loadError })}</p>;
  if (!members) return <p className={`${card} p-5 text-[14px] text-adm-muted`}>{t("app.loading")}</p>;

  const list = slots(members, invitations, now);
  const other = members.find((m) => !m.is_me);
  const open = openInvitation(invitations, now);

  return (
    <>
      <h1 className="text-[26px] font-extrabold tracking-[-0.3px] lg:hidden">{t("members.title")}</h1>
      <p className="max-w-[720px] text-[14px] leading-[1.5] text-adm-muted">{t("members.intro")}</p>

      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        {list.map((s, i) => (
          <li key={i} className={`${card} flex flex-col gap-3 p-4`}>
            <span className="text-[12px] font-extrabold tracking-[0.06em] text-adm-muted uppercase">{t("members.slot", { n: i + 1 })}</span>

            {s.kind === "member" && (
              <>
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-adm-soft text-adm-green">
                    <Icon d={ICON.user} size={22} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[16px] font-bold">{s.member.display_name || s.member.email}</span>
                      {s.member.is_me && <span className="flex-none rounded-full bg-adm-soft px-2 py-0.5 text-[11px] font-extrabold text-adm-green-dark">{t("members.me")}</span>}
                    </span>
                    {s.member.display_name && <span className="truncate text-[13px] text-adm-muted">{s.member.email}</span>}
                    <span className="text-[12px] text-adm-muted">{t("members.joined", { date: date(s.member.created_at) })}</span>
                  </div>
                </div>
                {!s.member.is_me && (
                  <button type="button" onClick={() => setConfirm({ kind: "remove", member: s.member })} className="h-11 self-start rounded-xl border-[1.5px] border-[#E8C9C1] px-4 text-[14px] font-bold text-adm-danger hover:bg-[#FDF3F0]">
                    {t("members.remove")}
                  </button>
                )}
                {s.member.is_me && canLeave(members) && (
                  <button type="button" onClick={() => setConfirm({ kind: "leave" })} className="h-11 self-start px-1 text-[14px] font-bold text-adm-danger">
                    {t("members.leave")}
                  </button>
                )}
              </>
            )}

            {s.kind === "invited" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-bold">{t("members.invited", { email: s.invitation.email })}</span>
                    <span className="text-[12px] text-adm-muted">{t("members.expires", { date: date(s.invitation.expires_at) })}</span>
                  </div>
                  <button type="button" onClick={() => cancelInvite(s.invitation)} className="h-10 flex-none rounded-xl border border-adm-line px-3 text-[13px] font-bold text-adm-danger">
                    {t("members.cancelInvite")}
                  </button>
                </div>
                <ShareBox text={shareText(s.invitation.email)} label={t("members.share")} onCopy={copy} copyLabel={t("members.copy")} waLabel={t("members.whatsapp")} />
              </div>
            )}

            {s.kind === "empty" && (
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  invite();
                }}
                className="flex flex-col gap-2"
              >
                <label htmlFor="inv-email" className="text-[15px] font-extrabold">{t("members.invite")}</label>
                {!active ? (
                  <p className="rounded-xl bg-[#FFF4DF] px-3 py-2.5 text-[13px] text-[#6B4A12]">{t("members.notActive")}</p>
                ) : (
                  <>
                    <p className="text-[12px] text-adm-muted">{t("members.inviteHint")}</p>
                    <div className="flex gap-2">
                      <input
                        id="inv-email"
                        type="email"
                        inputMode="email"
                        autoComplete="off"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (inviteError) setInviteError(null);
                        }}
                        placeholder={t("members.emailPlaceholder")}
                        aria-invalid={Boolean(inviteError)}
                        aria-describedby={inviteError ? "inv-err" : undefined}
                        className={`h-11 min-w-0 flex-1 rounded-xl border bg-white px-3.5 text-[16px] focus-visible:outline-2 focus-visible:outline-adm-green ${inviteError ? "border-adm-danger" : "border-adm-line"}`}
                      />
                      <button type="submit" disabled={busy || !email.trim()} className={btnPrimary}>
                        {busy ? t("members.sending") : t("members.send")}
                      </button>
                    </div>
                    {inviteError && <p id="inv-err" role="alert" className="text-[13px] font-semibold text-adm-danger">{t(inviteError, { message: "" })}</p>}
                  </>
                )}
              </form>
            )}
          </li>
        ))}
      </ul>
      {members.length >= 2 && !open && <p className="text-[13px] text-adm-muted">{t("members.full")}</p>}

      <Dialog
        open={Boolean(confirm)}
        onClose={() => !busy && setConfirm(null)}
        title={confirm?.kind === "remove" ? t("members.removeTitle", { email: confirm.member.email }) : t("members.leaveTitle", { masjid: org.fullName })}
      >
        <p className="mb-5 text-[15px] leading-[1.5]">
          {confirm?.kind === "remove" ? t("members.removeBody", { email: confirm.member.email }) : t("members.leaveBody", { email: other?.email ?? "" })}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => setConfirm(null)} className="h-[46px] rounded-xl border-[1.5px] border-adm-line bg-white text-[14px] font-bold">
            {t("members.cancel")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (confirm?.kind === "remove") removeMember(confirm.member, false);
              else {
                const self = members.find((m) => m.is_me);
                if (self) removeMember(self, true);
              }
            }}
            className="h-[46px] rounded-xl bg-adm-danger text-[14px] font-bold text-white disabled:opacity-60"
          >
            {confirm?.kind === "remove" ? t("members.removeConfirm") : t("members.leaveConfirm")}
          </button>
        </div>
      </Dialog>
      {toasts}
    </>
  );
}

function ShareBox({ text, label, onCopy, copyLabel, waLabel }: { text: string; label: string; onCopy: (t: string) => void; copyLabel: string; waLabel: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-adm-soft p-3">
      <span className="text-[12px] font-bold text-adm-green-dark">{label}</span>
      <p className="text-[14px] leading-[1.5] text-adm-ink select-all">{text}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onCopy(text)} className="h-10 rounded-xl border border-adm-line bg-white px-3 text-[13px] font-bold">
          {copyLabel}
        </button>
        <a href={whatsappUrl(text)} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center rounded-xl bg-[#1E9E62] px-3 text-[13px] font-bold text-white">
          {waLabel}
        </a>
      </div>
    </div>
  );
}