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
  "M12 3a9 9 0 1 0 0 18 M12 3v18", // 3 tema
  "M5 12l5 5L20 7", // RM0
] as const;

export function LineIcon({ d, size = 20, strokeWidth = 2, className = "" }: { d: string; size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}