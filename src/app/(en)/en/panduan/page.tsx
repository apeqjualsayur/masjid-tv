import { Guide } from "@/landing/Guide";
import { landingViewport } from "@/landing/metadata";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/en/panduan/");
export const viewport = landingViewport;

export default function PanduanEn() {
  return <Guide lang="en" />;
}