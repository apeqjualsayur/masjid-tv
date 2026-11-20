"use client";
// What a live preview needs (PRD Phase 2 §4.5): the masjid's screens, its display settings, and the
// list of theme × layout targets to preview on. Shared by the template editor and the notice sheet.
import { useEffect, useMemo, useState } from "react";
import type { LayoutKey, ThemeId } from "@/core";
import { THEMES_ROUND2_VISIBLE } from "@/config/features";
import { getSupabase } from "@/lib/supabase";
import { useT } from "../i18n";
import type { Membership } from "../routing";
import { layoutChoices, themeChoices } from "../screens/logic";
import { readDurations, readIqamah } from "../settings/logic";
import type { PreviewContext, PreviewTarget } from "./PreviewStage";

export interface PreviewScreen { id: string; name: string; theme: ThemeId; layout: LayoutKey }

export function usePreviewSetup(org: Pick<Membership, "orgId" | "fullName" | "shortName" | "logoPath">) {
  const { t } = useT();
  const [screens, setScreens] = useState<PreviewScreen[]>([]);
  const [ctx, setCtx] = useState<PreviewContext | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    sb.from("screens").select("id, name, theme, layout").eq("org_id", org.orgId).is("revoked_at", null).order("name").then(({ data }) => setScreens((data ?? []) as PreviewScreen[]));
    sb.from("org_settings").select("iqamah_min, durations, clock_24h, show_arabic, ticker").eq("org_id", org.orgId).single().then(({ data }) => {
      const logoUrl = org.logoPath ? sb.storage.from("media").getPublicUrl(org.logoPath).data.publicUrl : undefined;
      setCtx({
        masjid: { fullName: org.fullName, shortName: org.shortName, logoUrl },
        clock24h: Boolean(data?.clock_24h),
        showArabic: data?.show_arabic !== false,
        ticker: (data?.ticker as string[] | null) ?? [],
        iqamahMin: readIqamah(data?.iqamah_min),
        durations: readDurations(data?.durations),
      });
    });
  }, [org.orgId, org.fullName, org.shortName, org.logoPath]);

  const targets = useMemo<PreviewTarget[]>(() => {
    const fromScreens = screens.filter((s) => s.layout !== "full").map((s) => ({ key: s.id, theme: s.theme, layout: s.layout, label: t("editor.screenOption", { name: s.name, theme: t(`theme.${s.theme}`), layout: t(`layout.${s.layout}`) }) }));
    // Every theme on offer × every layout that shows announcements (incl. "Pengumuman sahaja" with round 2).
    const layouts = layoutChoices(THEMES_ROUND2_VISIBLE).filter((l) => l !== "full");
    const themes = themeChoices(THEMES_ROUND2_VISIBLE).sort((x, y) => Number(y === "tenang") - Number(x === "tenang"));
    const generic = themes.flatMap((th) => layouts.map((l) => ({ key: `${th}-${l}`, theme: th, layout: l, label: t("editor.themeOption", { theme: t(`theme.${th}`), layout: t(`layout.${l}`) }) })));
    return [...fromScreens, ...generic];
  }, [screens, t]);

  return { screens, ctx, targets };
}
