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

export const FEATURE_ICONS = [
  "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 7v5l3 2", // waktu solat
  "M12 3v4 M5 21V10a7 7 0 0 1 14 0v11", // azan, iqamah, solat
  "M4 4h16v12H4Z M8 20h8 M9 9h6", // khutbah
  "M4 5h16v11H8l-4 4Z", // templat
  "M3 3h18v18H3Z M21 15l-5-5L5 21", // poster
  "M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.5-.8Z", // logo
  "M2 4h13v9H2Z M17 8h5v9h-5", // beberapa skrin
  "M2 8.5a15 15 0 0 1 20 0 M5 12a10 10 0 0 1 14 0 M12 19h.01", // tanpa internet
] as const;

export function LineIcon({ d, size = 20, strokeWidth = 2, className = "" }: { d: string; size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}