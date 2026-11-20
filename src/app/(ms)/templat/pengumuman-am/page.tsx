// /templat/pengumuman-am/ — template gallery page (copy: src/content/templat, key "pengumuman").
import { TEMPLATE_PAGES } from "@/content/templat";
import { landingViewport } from "@/landing/metadata";
import { TemplatePage } from "@/landing/TemplatePage";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/templat/pengumuman-am/");
export const viewport = landingViewport;

export default function Page() {
  return <TemplatePage page={TEMPLATE_PAGES.pengumuman} />;
}
