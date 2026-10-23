import type { Metadata } from "next";
import { TvRoot } from "./tv-app";

export const metadata: Metadata = { title: "Masjid TV — Paparan" };

// Everything on the display depends on the client clock and local data, so it renders client-side.
export default function TvPage() {
  return <TvRoot />;
}