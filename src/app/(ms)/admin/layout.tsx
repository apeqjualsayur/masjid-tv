import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminProviders } from "@/admin/session";

export const metadata: Metadata = { title: "Masjid View", description: "Urus paparan TV masjid dan surau" };

// The TV page keeps <body> black and non-scrolling; the admin app scrolls inside its own layer.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div data-admin-scroll className="fixed inset-0 overflow-y-auto bg-adm-ground font-jakarta text-adm-ink antialiased">
      <AdminProviders>{children}</AdminProviders>
    </div>
  );
}