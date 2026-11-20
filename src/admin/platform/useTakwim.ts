"use client";
// public.islamic_events: every signed-in user may read it (RLS ie_select); only the platform owner writes.
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { TakwimRow } from "./takwim";

export function useTakwim() {
  const [rows, setRows] = useState<TakwimRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const { data, error: e } = await getSupabase().from("islamic_events").select("id, event_key, hijri_year, greg_date, status, note").order("greg_date");
    if (e) setError(e.message);
    else {
      setError(null);
      setRows((data ?? []) as TakwimRow[]);
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { rows, error, reload };
}
