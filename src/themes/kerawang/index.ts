import { POSTER_STAGE } from "../shared/poster";
import type { ThemeDefinition } from "../types";
import { FridayStrip } from "./friday";
import { AREA, BottomLayout, FullLayout, PosterLayout, SideLayout } from "./layouts";
import { KerawangPoster } from "./poster";
import { Azan, Iqamah, Khutbah, PreAzanBanner, Solat, Unavailable } from "./screens";
import { kerawangTemplates } from "./templates";

/** Konsep J, "Kerawang": carved timber arch panels, the current one gold-lit (_specs/01-theme-contract.md section 8, designs/J-*). */
export const kerawang: ThemeDefinition = {
  id: "kerawang",
  name: "Kerawang",
  fonts: ["Fraunces", "Manrope", "Noto Naskh Arabic"],
  layouts: { full: FullLayout, bottom: BottomLayout, side: SideLayout, poster: PosterLayout },
  posterArea: { bottom: AREA.bottom, side: AREA.side, poster: POSTER_STAGE },
  screens: { preAzanBanner: PreAzanBanner, azan: Azan, iqamah: Iqamah, solat: Solat, khutbah: Khutbah, unavailable: Unavailable },
  templates: kerawangTemplates,
  posterFrame: KerawangPoster,
  fridayInfo: FridayStrip,
};
