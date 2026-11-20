// /artikel: the articles hub (_specs/70-PRD-seo.md §3.E). BM only (decision D3).
import { ArticlesIndex } from "@/landing/ArticlesIndex";
import { landingViewport } from "@/landing/metadata";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/artikel/");
export const viewport = landingViewport;

export default function ArtikelPage() {
  return <ArticlesIndex />;
}
