// Live demo (_specs/20-PRD-landing.md §6): /tv?demo=1 shows public/config/demo.json with the bundled
// prayer data. No pairing screen and no Supabase: this file never imports the Supabase client.
import { parseSlides, type FetchLike } from "@/data";
import type { DisplaySource } from "./tv-app";
import { isLocalMode, parseScreenConfig } from "./config";

export const DEMO_URL = "/config/demo.json";

/** demo (always wins, even with Supabase configured) > local > paired. */
export function tvMode(search: string, supabaseConfigured: boolean): "demo" | "local" | "paired" {
  if (new URLSearchParams(search).get("demo") === "1") return "demo";
  return isLocalMode(search, supabaseConfigured) ? "local" : "paired";
}

/** demo.json = { screen: <screen.json shape>, slides: <sample-slides.json shape> }, through the same parsers. */
export async function loadDemo(fetchImpl: FetchLike = fetch): Promise<DisplaySource> {
  const res = await fetchImpl(DEMO_URL, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${DEMO_URL}: HTTP ${res.status}`);
  const raw = (await res.json()) as { screen?: unknown; slides?: unknown };
  const { config, warnings } = parseScreenConfig(raw.screen);
  const slides = parseSlides(raw.slides);
  return { config, configSource: "demo", slides: slides.items, warnings: [...warnings, ...slides.warnings], demo: true };
}