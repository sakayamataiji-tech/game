import type { NextConfig } from "next";

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
};

export default nextConfig;
