import type { ThemeDefinition } from "../types";
import { BottomLayout, FullLayout, SideLayout } from "./layouts";
import { SerambiPoster } from "./poster";
import { Azan, Iqamah, Khutbah, PreAzanBanner, Solat, Unavailable } from "./screens";
import { serambiTemplates } from "./templates";

export const serambi: ThemeDefinition = {
  id: "serambi",
  name: "Serambi",
  fonts: ["Barlow", "Barlow Condensed", "Reem Kufi", "Amiri"],
  layouts: { full: FullLayout, bottom: BottomLayout, side: SideLayout },
  screens: { preAzanBanner: PreAzanBanner, azan: Azan, iqamah: Iqamah, solat: Solat, khutbah: Khutbah, unavailable: Unavailable },
  templates: serambiTemplates,
  posterFrame: SerambiPoster,
};