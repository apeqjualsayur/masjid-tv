// The Masjid View app icon (Pintu Mihrab logo, public/brand/mv-app-icon.svg): green rounded square,
// white mihrab doorway, gold dot. One component for the admin app and the TV pairing screen.
export const BRAND_GREEN = "#146C4A";
export const BRAND_GOLD = "#E3B04B";

export function AppIcon({ size = 34, label = "Logo Masjid View" }: { size?: number; label?: string }) {
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox="0 0 100 100">
      <rect width="100" height="100" rx="22" fill={BRAND_GREEN} />
      <g transform="translate(50 51) scale(0.68) translate(-50 -49)">
        <path fill="#FFFFFF" fillRule="evenodd" d="M18 92 V48 C18 30 34 18 50 6 C66 18 82 30 82 48 V92 Z M32 92 V53 C32 41 41 33 50 25 C59 33 68 41 68 53 V92 Z" />
        <circle cx="50" cy="60" r="8" fill={BRAND_GOLD} />
      </g>
    </svg>
  );
}