// Line icons from designs/admin (24px grid, stroke currentColor).
import { AppIcon } from "@/brand/AppIcon";
export const ICON = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z",
  content: "M12 3 2 8l10 5 10-5Z M2 13l10 5 10-5",
  screens: "M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M8 21h8 M12 17v4",
  settings: "M4 7h9 M17 7h3 M4 17h3 M11 17h9 M15 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z M9 15a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z",
  members: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M2 21a7 7 0 0 1 14 0 M17 3.5a4 4 0 0 1 0 7.5 M22 21a7 7 0 0 0-4-6.3",
  platform: "M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7Z M9 12l2 2 4-4",
  announcement: "M4 5h16v11H8l-4 4Z M12 8v5 M9.5 10.5h5",
  poster: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M9 7a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z M21 15l-5-5L5 21",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4",
  chevronDown: "M7 10l5 5 5-5",
  chevronLeft: "M15 18l-6-6 6-6",
  close: "M6 6l12 12 M18 6 6 18",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21a8 8 0 0 1 16 0",
  check: "M5 12l5 5 9-10",
} as const;

export function Icon({ d, size = 24, strokeWidth = 2, className }: { d: string; size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

/** The app icon (Pintu Mihrab logo); see src/brand/AppIcon.tsx. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return <AppIcon size={size} />;
}