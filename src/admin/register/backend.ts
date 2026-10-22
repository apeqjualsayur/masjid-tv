// Supabase side of registration. Runs as the signed-in user: RLS and the schema functions decide.
// Tetapan (2.5) must also set the logo through set_org_logo, not an organisations update.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RegisterBackend } from "./logic";

export function supabaseRegisterBackend(sb: SupabaseClient, userId: string): RegisterBackend {
  const media = () => sb.storage.from("media");
  return {
    async registerOrg(args) {
      const { data, error } = await sb.rpc("register_org", args);
      if (error) throw error;
      return data as string;
    },
    async uploadObject(path, blob, contentType) {
      const { error } = await media().upload(path, blob, { contentType, upsert: false, cacheControl: "31536000" });
      if (error) throw error;
    },
    async insertMedia(row) {
      const { error } = await sb.from("media").insert({ ...row, created_by: userId });
      if (error) throw error;
    },
    async setOrgLogo(orgId, path) {
      const { error } = await sb.rpc("set_org_logo", { p_org: orgId, p_path: path });
      if (error) throw error;
    },
    async deleteMedia(path) {
      const { error } = await sb.from("media").delete().eq("path", path);
      if (error) throw error;
    },
    async removeObject(path) {
      const { data, error } = await media().remove([path]);
      if (error) throw error;
      // Storage answers "ok" even when it removed nothing (e.g. no permission to see the file).
      if (!data || data.length === 0) throw new Error("not_removed");
    },
  };
}