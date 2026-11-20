// /templat/mesyuarat/ — template gallery page (copy: src/content/templat, key "mesyuarat").
import { TEMPLATE_PAGES } from "@/content/templat";
import { landingViewport } from "@/landing/metadata";
import { TemplatePage } from "@/landing/TemplatePage";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/templat/mesyuarat/");
export const viewport = landingViewport;

export default function Page() {
  return <TemplatePage page={TEMPLATE_PAGES.mesyuarat} />;
}
