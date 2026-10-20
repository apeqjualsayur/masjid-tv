"use client";
import { getSupabase } from "@/lib/supabase";
import type { Membership } from "../routing";

/** Logo from storage, or the short-name monogram in the masjid's accent colour. */
export function OrgAvatar({ org, size }: { org: Pick<Membership, "shortName" | "logoPath" | "accentColor">; size: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.35) };
  if (org.logoPath) {
    const url = getSupabase().storage.from("media").getPublicUrl(org.logoPath).data.publicUrl;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" style={style} className="flex-none rounded-full bg-white object-contain" />
    );
  }
  return (
    <div aria-hidden="true" style={{ ...style, background: org.accentColor || "#146C4A" }} className="flex flex-none items-center justify-center rounded-full font-extrabold text-white">
      {org.shortName.slice(0, 3).toUpperCase()}
    </div>
  );
}