import { Landing } from "@/landing/Landing";
import { landingMetadata, landingViewport } from "@/landing/metadata";

export const metadata = landingMetadata("en");
export const viewport = landingViewport;

export default function HomeEn() {
  return <Landing lang="en" />;
}