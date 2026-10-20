"use client";
// Route guard: signed out → /admin; pages that need a masjid send the user where §4.1 says;
// Pentadbir-only and platform-only pages reject others (the database rejects them too).
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROUTES, routeAfterSignIn } from "../routing";
import { useAdmin } from "../session";

export interface GuardNeeds {
  /** An active masjid must be selected (most pages). */
  org?: boolean;
  pentadbir?: boolean;
  platform?: boolean;
}

/** True when the page may render. Redirects otherwise. */
export function useGuard(needs: GuardNeeds = {}): boolean {
  const a = useAdmin();
  const router = useRouter();
  let target: string | null = null;
  if (a.status === "signedOut") target = ROUTES.signIn;
  else if (a.status === "ready") {
    if (needs.platform && !a.isPlatformAdmin) target = routeAfterSignIn(a);
    else if (needs.org && !a.current) target = routeAfterSignIn(a);
    else if (needs.pentadbir && a.role !== "pentadbir") target = ROUTES.home;
  }
  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);
  return a.status === "ready" && !target;
}