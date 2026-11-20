// About page (_specs/70-PRD-seo.md §3.D), BM. English: /en/tentang. Copy: src/landing/i18n (tentang).
import { About } from "@/landing/About";
import { landingViewport } from "@/landing/metadata";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/tentang/");
export const viewport = landingViewport;

export default function TentangPage() {
  return <About lang="ms" />;
}
