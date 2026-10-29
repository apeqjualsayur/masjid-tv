import type { ThemeDefinition } from "../types";
import { FridayStrip } from "./friday";
import { BottomLayout, FullLayout, SideLayout } from "./layouts";
import { TenangPoster } from "./poster";
import { Azan, Iqamah, Khutbah, PreAzanBanner, Solat, Unavailable } from "./screens";
import { tenangTemplates } from "./templates";

export const tenang: ThemeDefinition = {
  id: "tenang",
  name: "Tenang",
  fonts: ["Manrope", "Noto Naskh Arabic"],
  // poster: placeholder (shows slides) until the announcement-only layout is built (round 2, T3).
  layouts: { full: FullLayout, bottom: BottomLayout, side: SideLayout, poster: BottomLayout },
  screens: { preAzanBanner: PreAzanBanner, azan: Azan, iqamah: Iqamah, solat: Solat, khutbah: Khutbah, unavailable: Unavailable },
  templates: tenangTemplates,
  posterFrame: TenangPoster,
  fridayInfo: FridayStrip,
};