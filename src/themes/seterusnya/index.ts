import { POSTER_STAGE } from "../shared/poster";
import type { ThemeDefinition } from "../types";
import { FridayStrip } from "./friday";
import { AREA, BottomLayout, FullLayout, PosterLayout, SideLayout } from "./layouts";
import { SeterusnyaPoster } from "./poster";
import { Azan, Iqamah, Khutbah, PreAzanBanner, Solat, Unavailable } from "./screens";
import { seterusnyaTemplates } from "./templates";

/** Konsep K, "Seterusnya": the next waktu is the hero, with its azan and iqamah times (_specs/01-theme-contract.md section 9, designs/K-*). */
export const seterusnya: ThemeDefinition = {
  id: "seterusnya",
  name: "Seterusnya",
  fonts: ["Manrope", "Noto Naskh Arabic"],
  layouts: { full: FullLayout, bottom: BottomLayout, side: SideLayout, poster: PosterLayout },
  posterArea: { bottom: AREA.bottom, side: AREA.side, poster: POSTER_STAGE },
  screens: { preAzanBanner: PreAzanBanner, azan: Azan, iqamah: Iqamah, solat: Solat, khutbah: Khutbah, unavailable: Unavailable },
  templates: seterusnyaTemplates,
  posterFrame: SeterusnyaPoster,
  fridayInfo: FridayStrip,
};
