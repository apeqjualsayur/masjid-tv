import { Landing } from "@/landing/Landing";
import { landingViewport } from "@/landing/metadata";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/en/");
export const viewport = landingViewport;

export default function HomeEn() {
  return <Landing lang="en" />;
}