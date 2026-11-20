// /artikel/ramadan-2027-tarikh-jangkaan/ — created by `npm run publish-article ramadan-2027-tarikh-jangkaan`. Content: src/content/artikel/ramadan-2027-tarikh-jangkaan.ts.
import article from "@/content/artikel/ramadan-2027-tarikh-jangkaan";
import { ArticlePage } from "@/landing/ArticlePage";
import { landingViewport } from "@/landing/metadata";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/artikel/ramadan-2027-tarikh-jangkaan/");
export const viewport = landingViewport;

export default function Page() {
  return <ArticlePage article={article} />;
}
