// Bundle (PRD Phase 2 §7) → the Phase 1 ScreenConfig, through the same validation and defaults
// as screen.json, so the engine, themes and playlist work unchanged.
import { bundleLayout, bundleTheme, mediaUrl, type Bundle } from "@/data/bundle";
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
    // Also for a bundle stored by an older app version: unknown → tenang / full (PRD round 2 D7).
    theme: bundleTheme(b.screen.theme),
    layout: bundleLayout(b.screen.layout),
    clock24h: b.settings.clock24h,
    showArabic: b.settings.showArabic,
    durations: b.settings.durations,
    iqamahMin: b.settings.iqamahMin,
    ticker: b.settings.ticker,
  });
  const accent = b.org.accentColor && /^#[0-9A-Fa-f]{6}$/.test(b.org.accentColor) ? b.org.accentColor : null;
  // Replaced while parsing (fresh bundle) or unknown in a bundle stored by an older app version.
  const badTheme = b.screen.replaced?.theme ?? (bundleTheme(b.screen.theme) !== b.screen.theme ? String(b.screen.theme) : undefined);
  const badLayout = b.screen.replaced?.layout ?? (bundleLayout(b.screen.layout) !== b.screen.layout ? String(b.screen.layout) : undefined);
  const unknown = [
    ...(badTheme !== undefined ? [`theme "${badTheme}" unknown; using ${config.theme}`] : []),
    ...(badLayout !== undefined ? [`layout "${badLayout}" unknown; using ${config.layout}`] : []),
  ];
  return { config, accentColor: accent, warnings: [...unknown, ...warnings].map((w) => `bundle: ${w}`) };
}
