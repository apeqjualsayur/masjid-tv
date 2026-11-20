import { Guide } from "@/landing/Guide";
import { landingViewport } from "@/landing/metadata";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/panduan/");
export const viewport = landingViewport;

export default function Panduan() {
  return <Guide lang="ms" />;
}