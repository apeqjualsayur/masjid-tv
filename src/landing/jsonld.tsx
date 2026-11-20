// Renders a page's structured data (built in src/seo/jsonld.ts): one <script type="application/ld+json">
// with an @graph per page (_specs/70-PRD-seo.md §3.B).
import { pageJsonLd } from "@/seo/jsonld";

/** JSON for a <script>: "<" escaped so text can never close the script tag. */
export const jsonForScript = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

export function JsonLd({ path }: { path: string }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonForScript(pageJsonLd(path)) }} />;
}