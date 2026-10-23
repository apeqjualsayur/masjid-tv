// Structured data for search engines (PRD §8): SoftwareApplication + FAQPage from the same FAQ copy.
// No ratings, download or user numbers (none are invented).
import { copy, homeHref, type Lang } from "./i18n";
import { SITE_URL } from "./metadata";

export function landingJsonLd(lang: Lang): object[] {
  const c = copy(lang);
  const url = SITE_URL + homeHref(lang);
  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Masjid View",
      url,
      description: c.meta.description,
      inLanguage: lang,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "MYR" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: lang,
      mainEntity: c.faq.items.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      })),
    },
  ];
}

/** JSON for a <script>: "<" escaped so text can never close the script tag. */
export const jsonForScript = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

export function JsonLd({ lang }: { lang: Lang }) {
  return (
    <>
      {landingJsonLd(lang).map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonForScript(d) }} />
      ))}
    </>
  );
}