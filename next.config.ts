import type { NextConfig } from "next";

// Static export: plain HTML and JS in out/, so the site can run on Vercel,
// Cloudflare or any static host without code changes.
const config: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default config;
