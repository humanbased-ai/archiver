import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  compress: true,
  assetPrefix: isProduction ? `https://s.thearp.ai/${process.env.CDN_ASSETS_PATH}` : undefined
};

export default nextConfig;
