import type { ThemeDefinition } from "../types";
import { FridayStrip } from "./friday";
import { POSTER_STAGE } from "../shared/poster";
import { BottomLayout, FullLayout, PosterLayout, SideLayout } from "./layouts";
import { TenangPoster } from "./poster";
import { Azan, Iqamah, Khutbah, PreAzanBanner, Solat, Unavailable } from "./screens";
import { tenangTemplates } from "./templates";

export const tenang: ThemeDefinition = {
  id: "tenang",
  name: "Tenang",
  fonts: ["Manrope", "Noto Naskh Arabic"],
  layouts: { full: FullLayout, bottom: BottomLayout, side: SideLayout, poster: PosterLayout },
  // The card boxes in layouts.tsx. (Not yet exactly 12:5 / 5:4: see contract rule 10.)
  posterArea: { bottom: { x: 96, y: 56, w: 1728, h: 670 }, side: { x: 72, y: 56, w: 1200, h: 968 }, poster: POSTER_STAGE },
  screens: { preAzanBanner: PreAzanBanner, azan: Azan, iqamah: Iqamah, solat: Solat, khutbah: Khutbah, unavailable: Unavailable },
  templates: tenangTemplates,
  posterFrame: TenangPoster,
  fridayInfo: FridayStrip,
};