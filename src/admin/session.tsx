"use client";
// Admin session: who is signed in, their masjids, the current masjid and role, platform owner.
// After every sign-in (and on each app load) pending invitations are accepted (PRD §4.1).
import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { LangProvider, readSavedLang, useT, type Lang } from "./i18n";
import { pickCurrentOrg, type MemberRole, type Membership, type OrgStatus } from "./routing";

const ORG_KEY = "mv:org";

export type SessionStatus = "loading" | "notConfigured" | "signedOut" | "ready" | "error";

interface AdminSession {
  status: SessionStatus;
  error: string | null;
  session: Session | null;
  email: string | null;
  displayName: string | null;
  orgs: Membership[];
  isPlatformAdmin: boolean;
  current: Membership | null;
  role: MemberRole | null;
  setCurrentOrg: (orgId: string) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}
const Ctx = createContext<AdminSession | null>(null);

interface OrgJoin {
  role: MemberRole;
  organisations: {
    id: string; full_name: string; short_name: string; kind: "masjid" | "surau"; zone: string; state: string; district: string;
    status: OrgStatus; status_reason: string | null; logo_path: string | null; accent_color: string;
  } | null;
}

function SessionInner({ children, langRef }: { children: ReactNode; langRef: { current: (l: Lang) => void } }) {
  const { setLang } = useT();
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Membership[]>([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  const load = useCallback(
    async (s: Session | null) => {
      if (!s) {
        loadedFor.current = null;
        setSession(null);
        setOrgs([]);
        setIsPlatformAdmin(false);
        setStatus("signedOut");
        return;
      }
      setSession(s);
      const sb = getSupabase();
      try {
        await sb.rpc("accept_invitations");
        const [members, admin, profile] = await Promise.all([
          sb.from("members").select("role, organisations(id, full_name, short_name, kind, zone, state, district, status, status_reason, logo_path, accent_color)").eq("user_id", s.user.id),
          sb.from("platform_admins").select("user_id").eq("user_id", s.user.id).maybeSingle(),
          sb.from("profiles").select("lang, display_name").eq("user_id", s.user.id).maybeSingle(),
        ]);
        if (members.error) throw members.error;
        const list: Membership[] = ((members.data ?? []) as unknown as OrgJoin[])
          .filter((m) => m.organisations)
          .map((m) => ({
            orgId: m.organisations!.id,
            role: m.role,
            status: m.organisations!.status,
            statusReason: m.organisations!.status_reason,
            fullName: m.organisations!.full_name,
            shortName: m.organisations!.short_name,
            kind: m.organisations!.kind,
            zone: m.organisations!.zone,
            state: m.organisations!.state,
            district: m.organisations!.district,
            logoPath: m.organisations!.logo_path,
            accentColor: m.organisations!.accent_color,
          }))
          .sort((a, b) => a.fullName.localeCompare(b.fullName));
        setOrgs(list);
        setIsPlatformAdmin(Boolean(admin.data));
        setDisplayName((profile.data?.display_name as string | null) ?? null);
        // First load for this user: the account's language wins over this device's last choice.
        const profileLang = profile.data?.lang as Lang | undefined;
        if (loadedFor.current !== s.user.id && profileLang && profileLang !== readSavedLang()) setLang(profileLang);
        loadedFor.current = s.user.id;
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(ORG_KEY);
        } catch {}
        setCurrentId(pickCurrentOrg(list, saved)?.orgId ?? null);
        setStatus("ready");
      } catch (e) {
        setError((e as { message?: string }).message ?? String(e));
        setStatus("error");
      }
    },
    [setLang],
  );

  useEffect(() => {
    if (!supabaseConfigured()) {
      setStatus("notConfigured");
      return;
    }
    const sb = getSupabase();
    let active = true;
    sb.auth.getSession().then(({ data }) => {
      if (active) load(data.session);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      if (!active) return;
      if (event === "SIGNED_IN" && loadedFor.current === s?.user.id) return; // token refresh after tab focus
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load(s);
      else if (s) setSession(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  // Language changes are saved to the account too (best effort).
  useEffect(() => {
    langRef.current = (l: Lang) => {
      if (session) getSupabase().from("profiles").update({ lang: l }).eq("user_id", session.user.id).then(() => {});
    };
  }, [session, langRef]);

  const current = useMemo(() => orgs.find((o) => o.orgId === currentId) ?? null, [orgs, currentId]);
  const value = useMemo<AdminSession>(
    () => ({
      status,
      error,
      session,
      email: session?.user.email ?? null,
      displayName,
      orgs,
      isPlatformAdmin,
      current,
      role: current?.role ?? null,
      setCurrentOrg: (id) => {
        setCurrentId(id);
        try {
          localStorage.setItem(ORG_KEY, id);
        } catch {}
      },
      refresh: () => load(session),
      signOut: async () => {
        await getSupabase().auth.signOut();
      },
    }),
    [status, error, session, displayName, orgs, isPlatformAdmin, current, load],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Language + session for every admin page. */
export function AdminProviders({ children }: { children: ReactNode }) {
  const langRef = useRef<(l: Lang) => void>(() => {});
  const onChange = useCallback((l: Lang) => langRef.current(l), []);
  return (
    <LangProvider onChange={onChange}>
      <SessionInner langRef={langRef}>{children}</SessionInner>
    </LangProvider>
  );
}

export function useAdmin(): AdminSession {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin() must be used inside <AdminProviders>");
  return c;
}