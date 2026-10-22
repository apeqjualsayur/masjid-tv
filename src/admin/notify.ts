// E-mails through the `notify` Edge Function (supabase/functions/notify). Fire and forget: an
// e-mail problem never blocks registration or review, and the app works before it is deployed.
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

export function notify(type: "registered" | "reviewed", orgId: string): void {
  if (!supabaseConfigured()) return;
  getSupabase()
    .functions.invoke("notify", { body: { type, org_id: orgId } })
    .then(({ error }) => {
      if (error) console.warn("[masjid-view] notify e-mail not sent:", error.message);
    })
    .catch(() => undefined);
}
