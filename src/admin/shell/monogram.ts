// Monogram for a masjid without a logo: two letters from the short name ("Nur Muhammad" → "NM").
export function monogram(shortName: string, fullName = ""): string {
  const src = shortName.trim() || fullName.replace(/^(masjid|surau)\s+/i, "").trim();
  const words = src.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
