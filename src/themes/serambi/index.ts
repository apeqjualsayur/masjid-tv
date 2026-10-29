import type { ThemeDefinition } from "../types";
import { FridayStrip } from "./friday";
import { BottomLayout, FullLayout, SideLayout } from "./layouts";
import { SerambiPoster } from "./poster";
import { Azan, Iqamah, Khutbah, PreAzanBanner, Solat, Unavailable } from "./screens";
import { serambiTemplates } from "./templates";

export const serambi: ThemeDefinition = {
  id: "serambi",
  name: "Serambi",
  fonts: ["Barlow", "Barlow Condensed", "Reem Kufi", "Amiri"],
  // poster: placeholder (shows slides) until the announcement-only layout is built (round 2, T3).
  layouts: { full: FullLayout, bottom: BottomLayout, side: SideLayout, poster: BottomLayout },
  screens: { preAzanBanner: PreAzanBanner, azan: Azan, iqamah: Iqamah, solat: Solat, khutbah: Khutbah, unavailable: Unavailable },
  templates: serambiTemplates,
  posterFrame: SerambiPoster,
  fridayInfo: FridayStrip,
};