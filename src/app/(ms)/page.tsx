import { Landing } from "@/landing/Landing";
import { landingMetadata, landingViewport } from "@/landing/metadata";

export const metadata = landingMetadata("ms");
export const viewport = landingViewport;

export default function Home() {
  return <Landing lang="ms" />;
}