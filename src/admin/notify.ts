// E-mails through the `notify` Edge Function (supabase/functions/notify). Fire and forget: an
// e-mail problem never blocks registration or review, and the app works before it is deployed.
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { logError } from "./log";

export function notify(type: "registered" | "reviewed", orgId: string): void {
  if (!supabaseConfigured()) return;
  getSupabase()
    .functions.invoke("notify", { body: { type, org_id: orgId } })
    .then(({ error }) => {
      if (error) logError({ where: "notify", kind: "email" }, error);
    })
    .catch(() => undefined);
}
