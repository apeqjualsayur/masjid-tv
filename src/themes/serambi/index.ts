import type { ThemeDefinition } from "../types";
import { FridayStrip } from "./friday";
import { POSTER_STAGE } from "../shared/poster";
import { BottomLayout, FullLayout, PosterLayout, SideLayout } from "./layouts";
import { SerambiPoster } from "./poster";
import { Azan, Iqamah, Khutbah, PreAzanBanner, Solat, Unavailable } from "./screens";
import { serambiTemplates } from "./templates";

export const serambi: ThemeDefinition = {
  id: "serambi",
  name: "Serambi",
  fonts: ["Barlow", "Barlow Condensed", "Reem Kufi", "Amiri"],
  layouts: { full: FullLayout, bottom: BottomLayout, side: SideLayout, poster: PosterLayout },
  // The slide areas in layouts.tsx. (Not yet exactly 12:5 / 5:4: see contract rule 10.)
  posterArea: { bottom: { x: 0, y: 0, w: 1920, h: 730 }, side: { x: 0, y: 0, w: 1320, h: 1080 }, poster: POSTER_STAGE },
  screens: { preAzanBanner: PreAzanBanner, azan: Azan, iqamah: Iqamah, solat: Solat, khutbah: Khutbah, unavailable: Unavailable },
  templates: serambiTemplates,
  posterFrame: SerambiPoster,
  fridayInfo: FridayStrip,
};