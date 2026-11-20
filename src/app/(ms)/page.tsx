import { Landing } from "@/landing/Landing";
import { landingViewport } from "@/landing/metadata";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/");
export const viewport = landingViewport;

export default function Home() {
  return <Landing lang="ms" />;
}