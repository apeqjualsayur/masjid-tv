// Privacy notice, BM (PRD §10). English: /en/privasi. Text: src/content/privasi.ts.
import { landingViewport } from "@/landing/metadata";
import { PrivacyNotice } from "@/landing/PrivacyNotice";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/privasi/");
export const viewport = landingViewport;

export default function PrivasiPage() {
  return <PrivacyNotice lang="ms" />;
}
