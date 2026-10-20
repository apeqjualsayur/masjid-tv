// Admin routing rules (PRD Phase 2 §4.1, §3). Pure: no React, no Supabase.

export type OrgStatus = "pending" | "active" | "rejected" | "suspended";
export type MemberRole = "pentadbir" | "editor";

export interface Membership {
  orgId: string;
  role: MemberRole;
  status: OrgStatus;
  statusReason: string | null;
  fullName: string;
  shortName: string;
  kind: "masjid" | "surau";
  zone: string;
  logoPath: string | null;
  accentColor: string;
}

/** Static export: real folders with trailing slashes, no dynamic segments. */
export const ROUTES = {
  signIn: "/admin/",
  home: "/admin/utama/",
  register: "/admin/daftar/",
  pending: "/admin/menunggu/",
  content: "/admin/kandungan/",
  picker: "/admin/baru/",
  poster: "/admin/poster/",
  screens: "/admin/skrin/",
  settings: "/admin/tetapan/",
  members: "/admin/ahli/",
  platform: "/admin/platform/",
  privacy: "/privasi/",
} as const;
export type AdminRoute = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * Where to go right after sign-in:
 * any active masjid → Utama; only pending/rejected/suspended → Menunggu;
 * no masjid → Platform for a platform owner, otherwise Daftar masjid.
 */
export function routeAfterSignIn(p: { isPlatformAdmin: boolean; orgs: Membership[] }): AdminRoute {
  if (p.orgs.some((o) => o.status === "active")) return ROUTES.home;
  if (p.orgs.length > 0) return ROUTES.pending;
  return p.isPlatformAdmin ? ROUTES.platform : ROUTES.register;
}

/** The masjid to work on: the saved choice if still an active membership, else the first active one. */
export function pickCurrentOrg(orgs: Membership[], savedId: string | null): Membership | null {
  const active = orgs.filter((o) => o.status === "active");
  return active.find((o) => o.orgId === savedId) ?? active[0] ?? null;
}

/** Pages only a Pentadbir may open (PRD §3): Tetapan and Ahli. Editors see Skrin read-only. */
export function canOpen(route: AdminRoute, role: MemberRole | null): boolean {
  if (route === ROUTES.settings || route === ROUTES.members) return role === "pentadbir";
  return true;
}