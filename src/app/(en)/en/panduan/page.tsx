import { Guide } from "@/landing/Guide";
import { landingMetadata, landingViewport } from "@/landing/metadata";

export const metadata = landingMetadata("en", "panduan");
export const viewport = landingViewport;

export default function PanduanEn() {
  return <Guide lang="en" />;
}