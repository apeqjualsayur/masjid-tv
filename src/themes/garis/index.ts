import { POSTER_STAGE } from "../shared/poster";
import type { ThemeDefinition } from "../types";
import { FridayStrip } from "./friday";
import { AREA, BottomLayout, FullLayout, PosterLayout, SideLayout } from "./layouts";
import { GarisPoster } from "./poster";
import { Azan, Iqamah, Khutbah, PreAzanBanner, Solat, Unavailable } from "./screens";
import { garisTemplates } from "./templates";

/** Konsep I, "Garis Masa": the day as a proportional timeline (_specs/01-theme-contract.md section 7, designs/I-*). */
export const garis: ThemeDefinition = {
  id: "garis",
  name: "Garis Masa",
  fonts: ["Fraunces", "Manrope", "Noto Naskh Arabic"],
  layouts: { full: FullLayout, bottom: BottomLayout, side: SideLayout, poster: PosterLayout },
  posterArea: { bottom: AREA.bottom, side: AREA.side, poster: POSTER_STAGE },
  screens: { preAzanBanner: PreAzanBanner, azan: Azan, iqamah: Iqamah, solat: Solat, khutbah: Khutbah, unavailable: Unavailable },
  templates: garisTemplates,
  posterFrame: GarisPoster,
  fridayInfo: FridayStrip,
};
