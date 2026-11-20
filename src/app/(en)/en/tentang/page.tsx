// About page (_specs/70-PRD-seo.md §3.D), English, under the (en) root layout. BM: /tentang. Copy: src/landing/i18n (tentang).
import { About } from "@/landing/About";
import { landingViewport } from "@/landing/metadata";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/en/tentang/");
export const viewport = landingViewport;

export default function AboutPageEn() {
  return <About lang="en" />;
}
