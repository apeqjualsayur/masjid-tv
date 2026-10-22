"use client";
// The single Supabase browser client (PRD Phase 2 §7). Public URL + publishable/anon key only:
// Row Level Security protects the data. The service-role key never appears in app code.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** True when the public Supabase settings were provided at build time. */
export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Created lazily in the browser (never during the static build), so a missing env var shows a
 * message in the admin app instead of breaking the whole build.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
  });
  return client;
}

let tvClient: SupabaseClient | null = null;

/**
 * The TV has no user account: it only calls pair_start / pair_status / screen_bundle with its
 * device secret (PRD §7). No session is stored or refreshed, so it never touches the admin login.
 */
export function getTvSupabase(): SupabaseClient {
  if (tvClient) return tvClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  tvClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "masjid-view-tv" },
  });
  return tvClient;
}
