import type { Metadata } from "next";
import { TvRoot } from "./tv-app";

// The TV page (and its demo) is not for search results: noindex (PRD §6).
export const metadata: Metadata = { title: "Masjid TV — Paparan", robots: { index: false, follow: false } };

// Everything on the display depends on the client clock and local data, so it renders client-side.
export default function TvPage() {
  return <TvRoot />;
}