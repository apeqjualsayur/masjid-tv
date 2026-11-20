// Structured data (_specs/70-PRD-seo.md §3.B): pure builders, one @graph per page. Inputs come from
// site facts, the page registry and the same i18n/content the page renders (the FAQ schema is the FAQ
// list on the page), so the markup can never say something the page does not. No ratings, user counts
// or reviews (PRD §2.3). Empty values are dropped, never emitted.
import { copy, homeHref, pageHref, type Lang } from "@/landing/i18n";
import { articleBySlug } from "@/content/artikel";
import { fill } from "@/landing/counts";
import { TEMPLATES } from "@/templates/schema";
import { plain } from "@/content/artikel/text";
import { guideSections } from "@/landing/guide-content";
import { site } from "@/landing/site";
import { seoPage, type SeoPage } from "./routes";
import { pageText } from "./metadata";
import { SITE } from "./site";

type Node = Record<string, unknown>;
const abs = (path: string) => SITE.url + path;
export const ORG_ID = `${SITE.url}/#organization`;
const websiteId = (lang: Lang) => `${abs(homeHref(lang))}#website`;
const LOGO = { url: "/apple-touch-icon.png", width: 180, height: 180 };

/** Drop undefined, null, "" and [] (recursively), so no builder ever emits an empty value. */
export function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clean).filter((x) => !isEmpty(x)) as T;
  if (v && typeof v === "object") {
    const out: Node = {};
    for (const [k, x] of Object.entries(v as Node)) {
      const c = clean(x);
      if (!isEmpty(c)) out[k] = c;
    }
    return out as T;
  }
  return v;
}
const isEmpty = (x: unknown) => x === undefined || x === null || x === "" || (Array.isArray(x) && x.length === 0) || (typeof x === "object" && x !== null && !Array.isArray(x) && Object.keys(x).length === 0);

/** sameAs: only the profiles that exist (site.ts; empty = left out). */
export const sameAs = (): string[] => [site.facebookUrl, site.youtubeUrl].filter((u) => u.trim() !== "");

export function organization(): Node {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE.brand,
    url: abs("/"),
    logo: { "@type": "ImageObject", url: abs(LOGO.url), width: LOGO.width, height: LOGO.height },
    email: site.contactEmail,
    contactPoint: site.contactEmail ? { "@type": "ContactPoint", contactType: "customer support", email: site.contactEmail, availableLanguage: ["ms", "en"] } : undefined,
    sameAs: sameAs(),
  };
}

export function website(lang: Lang): Node {
  return { "@type": "WebSite", "@id": websiteId(lang), name: SITE.brand, url: abs(homeHref(lang)), inLanguage: lang, publisher: { "@id": ORG_ID } };
}

export function softwareApplication(lang: Lang): Node {
  const c = copy(lang);
  return {
    "@type": "SoftwareApplication",
    "@id": `${abs(homeHref(lang))}#app`,
    name: SITE.brand,
    url: abs(homeHref(lang)),
    description: c.meta.description,
    inLanguage: lang,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web browser, Android TV",
    offers: { "@type": "Offer", price: "0", priceCurrency: "MYR" },
    downloadUrl: abs("/apk"),
    featureList: c.features.items.map((f) => fill(f.t)),
    screenshot: abs(SITE.ogImage.url),
    publisher: { "@id": ORG_ID },
  };
}

export function faqPage(lang: Lang, items: readonly { q: string; a: string }[]): Node {
  return {
    "@type": "FAQPage",
    inLanguage: lang,
    mainEntity: items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })),
  };
}

/** HowTo from the guide's own sections: one HowToSection per section, its numbered steps inside. */
export function howTo(lang: Lang, name: string, description: string, sections: readonly { title: string; steps: readonly string[] }[]): Node {
  return {
    "@type": "HowTo",
    name,
    description,
    inLanguage: lang,
    step: sections.map((s) => ({
      "@type": "HowToSection",
      name: s.title,
      itemListElement: s.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
    })),
  };
}

export function breadcrumbList(items: readonly { name: string; path: string }[]): Node {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export function aboutPage(p: SeoPage): Node {
  const { title, description } = pageText(p);
  return { "@type": "AboutPage", "@id": abs(p.path), url: abs(p.path), name: title, description, inLanguage: p.lang, isPartOf: { "@id": websiteId(p.lang) }, about: { "@id": ORG_ID } };
}

export interface ArticleInput {
  path: string;
  lang: Lang;
  headline: string;
  description: string;
  /** YYYY-MM-DD */
  datePublished: string;
  dateModified: string;
  /** Site path of the article image; default the share image. */
  image?: string;
}
export function article(a: ArticleInput): Node {
  return {
    "@type": "Article",
    "@id": `${abs(a.path)}#article`,
    mainEntityOfPage: abs(a.path),
    headline: a.headline,
    description: a.description,
    datePublished: a.datePublished,
    dateModified: a.dateModified,
    inLanguage: a.lang,
    image: abs(a.image ?? SITE.ogImage.url),
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
  };
}

/** One document: { @context, @graph }, cleaned. */
export function graph(nodes: Node[]): Node {
  return clean({ "@context": "https://schema.org", "@graph": nodes });
}

/** The page's whole JSON-LD, by its registry type (PRD §3.B table). */
export function pageJsonLd(path: string): Node {
  const p = seoPage(path);
  const c = copy(p.lang);
  const nodes: Node[] = [organization(), website(p.lang)];
  const home = { name: c.seo.breadcrumbHome, path: homeHref(p.lang) };
  switch (p.type) {
    case "home":
      nodes.push(softwareApplication(p.lang), faqPage(p.lang, c.faq.items));
      break;
    case "guide":
      nodes.push(
        howTo(p.lang, c.panduan.title, c.panduan.intro, guideSections(p.lang)),
        breadcrumbList([home, { name: c.panduan.title, path: pageHref(p.lang, "panduan") }]),
      );
      break;
    case "hub":
      nodes.push(breadcrumbList([home, { name: c.artikel.breadcrumb, path: p.path }]));
      break;
    case "article": {
      const a = articleBySlug(p.slug ?? "");
      if (!a) throw new Error(`No article for ${p.path}`);
      nodes.push(
        article({ path: p.path, lang: a.lang, headline: a.title, description: a.description, datePublished: a.datePublished, dateModified: a.dateModified, image: a.image }),
        breadcrumbList([home, { name: c.artikel.breadcrumb, path: "/artikel/" }, { name: a.title, path: p.path }]),
      );
      const faqs = a.blocks.flatMap((b) => (b.type === "faq" ? b.items : []));
      if (faqs.length) nodes.push(faqPage(a.lang, faqs.map((f) => ({ q: f.q, a: plain(f.a) }))));
      break;
    }
    case "gallery":
      nodes.push(breadcrumbList([home, { name: c.templat.breadcrumb, path: p.path }]));
      break;
    case "template":
      nodes.push(breadcrumbList([home, { name: c.templat.breadcrumb, path: "/templat/" }, { name: TEMPLATES[p.templateKey!].name.ms, path: p.path }]));
      break;
    case "about":
      nodes.push(aboutPage(p), breadcrumbList([home, { name: pageText(p).title.replace(/ · .*$/, ""), path: p.path }]));
      break;
    default:
      break;
  }
  return graph(nodes);
}
