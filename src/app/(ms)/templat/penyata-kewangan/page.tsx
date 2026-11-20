// /templat/penyata-kewangan/ — template gallery page (copy: src/content/templat, key "kewangan").
import { TEMPLATE_PAGES } from "@/content/templat";
import { landingViewport } from "@/landing/metadata";
import { TemplatePage } from "@/landing/TemplatePage";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/templat/penyata-kewangan/");
export const viewport = landingViewport;

export default function Page() {
  return <TemplatePage page={TEMPLATE_PAGES.kewangan} />;
}
