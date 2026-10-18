import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Masjid TV",
  description: "Paparan waktu solat untuk masjid dan surau",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ms" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
