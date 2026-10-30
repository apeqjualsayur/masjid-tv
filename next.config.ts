import type { NextConfig } from "next";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import pkg from "./package.json";
import { RELEASE } from "./src/config/release";

// Shown in the debug status overlay: package version + build time (Malaysia time). Computed once per
// build: Next loads this file in several processes, which inherit MV_BUILT_AT from the first one.
const builtAt = (process.env.MV_BUILT_AT ??= new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 16).replace("T", " "));
const version = `${pkg.version} (${builtAt})`;

// public/version.json (git-ignored): what is live, for the admin update notice and the TV's
// "new version" hint (src/config/release.ts). Same build time as NEXT_PUBLIC_APP_VERSION.
writeFileSync(join(process.cwd(), "public", "version.json"), JSON.stringify({ version, builtAt, minTvBuild: RELEASE.minTvBuild }) + "\n");

const nextConfig: NextConfig = {
  // Static export: the whole app is plain files in out/, served from any static host.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default nextConfig;
