import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Static export: `next build` writes a fully static site to ./out.
// NEXT_PUBLIC_BASE_PATH lets the same build be hosted under a sub path
// (e.g. GitHub Pages: /game/nlh-dealer-trainer).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // The repo root has its own lockfile (Blockle); pin the workspace root to this app.
  turbopack: { root: path.dirname(fileURLToPath(import.meta.url)) },
};

export default nextConfig;
