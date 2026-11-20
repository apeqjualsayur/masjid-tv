// Facebook / YouTube links (PRD 70 §3.D, decision D2): shown only when set in site.ts. The same URLs
// feed Organization.sameAs (src/seo/jsonld.ts), so they are never typed twice.
import { copy, type Lang } from "./i18n";
import { site } from "./site";

const ICONS = {
  // Simple outline marks (decorative; the link text is the accessible name).
  facebook: "M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z",
  youtube: "M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3Z M10 9l5 3-5 3Z",
} as const;

export function socialLinks(lang: Lang): { key: keyof typeof ICONS; url: string; label: string }[] {
  const c = copy(lang).tentang;
  return [
    { key: "facebook" as const, url: site.facebookUrl, label: c.facebook },
    { key: "youtube" as const, url: site.youtubeUrl, label: c.youtube },
  ].filter((s) => s.url.trim() !== "");
}

export function SocialLinks({ lang, className, linkClass }: { lang: Lang; className?: string; linkClass: string }) {
  const links = socialLinks(lang);
  if (!links.length) return null;
  return (
    <ul className={className}>
      {links.map((s) => (
        <li key={s.key}>
          <a href={s.url} target="_blank" rel="noopener me" className={linkClass}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={ICONS[s.key]} />
            </svg>
            {s.label}
            <span className="sr-only"> {copy(lang).a11y.newTab}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
