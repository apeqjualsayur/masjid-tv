// Line-icon paths from the design (24×24, stroke). Decorative only.
export const DEVICE_ICONS = [
  "M3 5h18v11H3Z M8 20h8 M12 16v4", // smart TV
  "M5 16h14v3H5Z M3 5h18v8H3Z", // TV box
  "M5 5h14v10H5Z M2 19h20", // laptop
  "M9 3h6v12H9Z M10 15v6h4v-6", // TV stick
] as const;

export const STAT_ICONS = [
  "M12 7v5l3 2 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", // 7 waktu
  "M5 5h14v14H5Z M9 9h6", // 10 templat
  "M12 3a9 9 0 1 0 0 18 M12 3v18", // tema
  "M5 12l5 5L20 7", // RM0
] as const;

/** Feature cards, in the order of features.items in the copy. */
export const FEATURE_ICONS = [
  "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 7v5l3 2", // waktu solat
  "M12 3v4 M5 21V10a7 7 0 0 1 14 0v11", // azan, iqamah, solat
  "M4 4h16v12H4Z M8 20h8 M9 9h6", // khutbah
  "M2 8.5a15 15 0 0 1 20 0 M5 12a10 10 0 0 1 14 0 M12 19h.01", // tanpa internet
  "M4 5h16v11H8l-4 4Z", // templat
  "M3 3h18v18H3Z M21 15l-5-5L5 21", // poster
  "M4 6h16v14H4Z M4 10h16 M8 3v4 M16 3v4 M10 15h6 M13 12l3 3-3 3", // tangguh / batal
  "M6 3h12 M6 21h12 M7 3c0 6 10 6 10 9s-10 3-10 9 M17 3c0 6-10 6-10 9s10 3 10 9", // kiraan detik
  "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z", // hari kebesaran
  "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M2 21a7 7 0 0 1 14 0 M16 3.5a4 4 0 0 1 0 7.5 M18 14a6 6 0 0 1 4 7", // jadual imam & bilal
  "M3 5h18v11H3Z M8 20h8 M12 7v6 M9 10l3 3 3-3", // aplikasi Android TV
  "M2 4h13v9H2Z M17 8h5v9h-5", // beberapa skrin, logo
] as const;

/** The full-width "Dua TV, dua tugas" card. */
export const DUAL_ICON = "M2 4h13v9H2Z M17 8h5v9h-5";

export function LineIcon({ d, size = 20, strokeWidth = 2, className = "" }: { d: string; size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}