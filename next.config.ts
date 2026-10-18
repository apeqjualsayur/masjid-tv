import type { NextConfig } from "next";
import pkg from "./package.json";

// Shown in the debug status overlay: package version + build time (Malaysia time).
const builtAt = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 16).replace("T", " ");

const nextConfig: NextConfig = {
  // Static export: the whole app is plain files in out/, served from any static host.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_APP_VERSION: `${pkg.version} (${builtAt})` },
};

export default nextConfig;
