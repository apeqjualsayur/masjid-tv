"use client";
// The masjid's petugas list and roster slots (PRD enhancements §6.2). Used by the Petugas page and by
// the Jadual Imam & Bilal editor preview.
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { byOrder, type Petugas, type SlotRow } from "./logic";

export function usePetugasData(orgId: string) {
  const [list, setList] = useState<Petugas[] | null>(null);
  const [slots, setSlots] = useState<SlotRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const sb = getSupabase();
    const [p, s] = await Promise.all([
      sb.from("petugas").select("id, name, title, roles, active, sort_order").eq("org_id", orgId),
      sb.from("roster_slots").select("day_of_week, waktu, role, petugas_id").eq("org_id", orgId),
    ]);
    const e = p.error ?? s.error;
    if (e) return setError(e.message);
    setError(null);
    setList(((p.data ?? []) as Petugas[]).sort(byOrder));
    setSlots((s.data ?? []) as SlotRow[]);
  }, [orgId]);
  useEffect(() => {
    load();
  }, [load]);
  return { list, slots, error, reload: load, setList };
}
