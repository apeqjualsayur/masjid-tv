// /artikel/cara-pasang-skrin-waktu-solat-tv-masjid/ — created by `npm run publish-article cara-pasang-skrin-waktu-solat-tv-masjid`. Content: src/content/artikel/cara-pasang-skrin-waktu-solat-tv-masjid.ts.
import article from "@/content/artikel/cara-pasang-skrin-waktu-solat-tv-masjid";
import { ArticlePage } from "@/landing/ArticlePage";
import { landingViewport } from "@/landing/metadata";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/artikel/cara-pasang-skrin-waktu-solat-tv-masjid/");
export const viewport = landingViewport;

export default function Page() {
  return <ArticlePage article={article} />;
}
