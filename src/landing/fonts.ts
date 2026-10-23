// Landing page font (PRD §3). Outfit is used only here. Manrope, used inside the TV mockups, is the
// one the themes already load (src/app/fonts.ts), so it is not loaded twice.
import { Outfit } from "next/font/google";

export const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-outfit-landing",
  display: "swap",
});