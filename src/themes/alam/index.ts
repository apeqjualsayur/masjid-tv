import type { ThemeDefinition } from "../types";
import { FridayStrip } from "./friday";
import { BottomLayout, FullLayout, SideLayout } from "./layouts";
import { AlamPoster } from "./poster";
import { Azan, Iqamah, Khutbah, PreAzanBanner, Solat, Unavailable } from "./screens";
import { alamTemplates } from "./templates";

export const alam: ThemeDefinition = {
  id: "alam",
  name: "Alam",
  fonts: ["Plus Jakarta Sans", "Noto Naskh Arabic"],
  // poster: placeholder (shows slides) until the announcement-only layout is built (round 2, T3).
  layouts: { full: FullLayout, bottom: BottomLayout, side: SideLayout, poster: BottomLayout },
  screens: { preAzanBanner: PreAzanBanner, azan: Azan, iqamah: Iqamah, solat: Solat, khutbah: Khutbah, unavailable: Unavailable },
  templates: alamTemplates,
  posterFrame: AlamPoster,
  fridayInfo: FridayStrip,
};