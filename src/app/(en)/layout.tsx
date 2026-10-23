import type { Metadata, Viewport } from "next";
import { fontVariables } from "../fonts";
import "../globals.css";

// Root layout for the English pages (/en/…), so <html lang="en"> is in the static HTML.
// The (ms) group has the BM root layout used by everything else.
export const metadata: Metadata = {
  title: "Masjid View",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayoutEn({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}