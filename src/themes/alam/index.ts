import type { ThemeDefinition } from "../types";
import { FridayStrip } from "./friday";
import { POSTER_STAGE } from "../shared/poster";
import { BottomLayout, FullLayout, PosterLayout, SideLayout } from "./layouts";
import { AlamPoster } from "./poster";
import { Azan, Iqamah, Khutbah, PreAzanBanner, Solat, Unavailable } from "./screens";
import { alamTemplates } from "./templates";

export const alam: ThemeDefinition = {
  id: "alam",
  name: "Alam",
  fonts: ["Plus Jakarta Sans", "Noto Naskh Arabic"],
  layouts: { full: FullLayout, bottom: BottomLayout, side: SideLayout, poster: PosterLayout },
  // The card boxes in layouts.tsx. (Not yet exactly 12:5 / 5:4: see contract rule 10.)
  posterArea: { bottom: { x: 36, y: 36, w: 1848, h: 744 }, side: { x: 36, y: 36, w: 1280, h: 1008 }, poster: POSTER_STAGE },
  screens: { preAzanBanner: PreAzanBanner, azan: Azan, iqamah: Iqamah, solat: Solat, khutbah: Khutbah, unavailable: Unavailable },
  templates: alamTemplates,
  posterFrame: AlamPoster,
  fridayInfo: FridayStrip,
};