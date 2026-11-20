// The /panduan sections, built once for the page and its HowTo JSON-LD (_specs/70-PRD-seo.md §3.C, S6).
// The app section's install steps are the admin "Pasang app di TV" card strings (src/admin/i18n,
// screens.app), so the guide and the admin card can never disagree; the guide adds its own pairing and
// settings steps (the card's last step says "here", which only makes sense inside the admin app).
import adminEn from "@/admin/i18n/en.json";
import adminMs from "@/admin/i18n/ms.json";
import { APK_SHORT_LINK } from "@/config/app-shell";
import { copy, type Lang } from "./i18n";

/** What the TV owner types into Downloader: the same constant the admin card fills in. */
export const APK_LINK = APK_SHORT_LINK;

export interface GuideSection {
  id: string;
  title: string;
  /** One sentence saying what the section is for (answer first). */
  lead: string;
  steps: string[];
  /** A closing remark under the steps. */
  note?: string;
  img: { file: string; alt: string };
}

export function guideSections(lang: Lang): GuideSection[] {
  const g = copy(lang).panduan;
  const card = (lang === "en" ? adminEn : adminMs).screens.app;
  const app: GuideSection = {
    id: g.app.id,
    title: g.app.title,
    lead: card.why,
    steps: [card.step1, card.step2, card.step3.replace("{link}", APK_LINK), card.step4, ...g.app.steps],
    note: card.kiosk,
    img: g.app.img,
  };
  return [app, ...g.sections];
}
