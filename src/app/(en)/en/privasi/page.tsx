// Privacy notice, English (PRD §10), under the (en) root layout so <html lang="en">. BM: /privasi.
import { landingViewport } from "@/landing/metadata";
import { PrivacyNotice } from "@/landing/PrivacyNotice";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/en/privasi/");
export const viewport = landingViewport;

export default function PrivacyPageEn() {
  return <PrivacyNotice lang="en" />;
}
