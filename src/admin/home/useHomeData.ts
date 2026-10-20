"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { ScreenRow, SlideRow } from "./logic";

/** Screens (not revoked) and published slides of one masjid, refreshed every 60 s. */
export function useHomeData(orgId: string | null) {
  const [screens, setScreens] = useState<ScreenRow[]>([]);
  const [slides, setSlides] = useState<SlideRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    const sb = getSupabase();
    const [sc, sl] = await Promise.all([
      sb.from("screens").select("id, name, theme, layout, last_seen_at, revoked_at").eq("org_id", orgId).is("revoked_at", null).order("created_at"),
      sb
        .from("slides")
        .select("id, type, template_key, fields, status, starts_at, ends_at, duration_s, days_of_week, priority, sort_order, screen_ids")
        .eq("org_id", orgId)
        .eq("status", "published")
        .order("sort_order"),
    ]);
    const e = sc.error ?? sl.error;
    setError(e ? e.message : null);
    if (!sc.error) setScreens((sc.data ?? []) as ScreenRow[]);
    if (!sl.error) setSlides((sl.data ?? []) as SlideRow[]);
    setLoaded(true);
  }, [orgId]);

  useEffect(() => {
    setLoaded(false);
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  return { screens, slides, error, loaded, reload: load };
}

/** Current time, updated every `everyMs`. */
export function useClock(everyMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}