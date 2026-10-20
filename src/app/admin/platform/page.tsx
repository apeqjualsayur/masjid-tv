"use client";
import { PlaceholderPage } from "@/admin/Placeholder";

export default function PlatformPage() {
  return <PlaceholderPage titleKey="nav.platform" needs={{ org: false, platform: true }} />;
}