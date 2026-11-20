// /templat: the template gallery (_specs/70-PRD-seo.md §3.F). BM only.
import { landingViewport } from "@/landing/metadata";
import { TemplatesGallery } from "@/landing/TemplatesGallery";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/templat/");
export const viewport = landingViewport;

export default function TemplatPage() {
  return <TemplatesGallery />;
}
