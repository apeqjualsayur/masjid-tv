// Monogram for the "Cuba sekarang" preview (design renderVals): first letters of the first two words
// once "Masjid" / "Surau" are removed; "MV" when nothing is left.
export const NAME_MAX = 60;

export function tryMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w && !/^(masjid|surau)$/i.test(w));
  return words.slice(0, 2).map((w) => [...w][0] ?? "").join("").toUpperCase() || "MV";
}