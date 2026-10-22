// Bundle (PRD Phase 2 §7) → the Phase 1 ScreenConfig, through the same validation and defaults
// as screen.json, so the engine, themes and playlist work unchanged.
import { mediaUrl, type Bundle } from "@/data/bundle";
import { parseScreenConfig, type ScreenConfig } from "./config";

export interface BundleConfig {
  config: ScreenConfig;
  /** Organisation accent colour. Carried through, but themes have no accent slot yet (theme contract). */
  accentColor: string | null;
  warnings: string[];
}

export function bundleToScreenConfig(b: Bundle, supabaseUrl: string): BundleConfig {
  const { config, warnings } = parseScreenConfig({
    // An empty logo means "no logo" (the theme shows the short name); never the sample logo.
    masjid: { fullName: b.org.fullName, shortName: b.org.shortName, logo: b.org.logoPath ? mediaUrl(supabaseUrl, b.org.logoPath) : "" },
    zone: b.org.zone,
    theme: b.screen.theme,
    layout: b.screen.layout,
    clock24h: b.settings.clock24h,
    showArabic: b.settings.showArabic,
    durations: b.settings.durations,
    iqamahMin: b.settings.iqamahMin,
    ticker: b.settings.ticker,
  });
  const accent = b.org.accentColor && /^#[0-9A-Fa-f]{6}$/.test(b.org.accentColor) ? b.org.accentColor : null;
  return { config, accentColor: accent, warnings: warnings.map((w) => `bundle: ${w}`) };
}
