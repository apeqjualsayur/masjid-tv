import { POSTER_STAGE } from "../shared/poster";
import type { ThemeDefinition } from "../types";
import { FridayStrip } from "./friday";
import { AREA, BottomLayout, FullLayout, PosterLayout, SideLayout } from "./layouts";
import { FalakPoster } from "./poster";
import { Azan, Iqamah, Khutbah, PreAzanBanner, Solat, Unavailable } from "./screens";
import { falakTemplates } from "./templates";

/** Konsep G, "Falak": analogue dial (_specs/01-theme-contract.md section 6, designs/G-*). */
export const falak: ThemeDefinition = {
  id: "falak",
  name: "Falak",
  fonts: ["Fraunces", "Manrope", "Noto Naskh Arabic"],
  layouts: { full: FullLayout, bottom: BottomLayout, side: SideLayout, poster: PosterLayout },
  posterArea: { bottom: AREA.bottom, side: AREA.side, poster: POSTER_STAGE },
  screens: { preAzanBanner: PreAzanBanner, azan: Azan, iqamah: Iqamah, solat: Solat, khutbah: Khutbah, unavailable: Unavailable },
  templates: falakTemplates,
  posterFrame: FalakPoster,
  fridayInfo: FridayStrip,
};
