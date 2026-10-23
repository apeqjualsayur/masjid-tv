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
  layouts: { full: FullLayout, bottom: BottomLayout, side: SideLayout },
  screens: { preAzanBanner: PreAzanBanner, azan: Azan, iqamah: Iqamah, solat: Solat, khutbah: Khutbah, unavailable: Unavailable },
  templates: alamTemplates,
  posterFrame: AlamPoster,
  fridayInfo: FridayStrip,
};