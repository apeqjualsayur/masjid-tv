import { Guide } from "@/landing/Guide";
import { landingMetadata, landingViewport } from "@/landing/metadata";

export const metadata = landingMetadata("ms", "panduan");
export const viewport = landingViewport;

export default function Panduan() {
  return <Guide lang="ms" />;
}