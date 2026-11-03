import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Next treats localhost vs 127.0.0.1 as different origins and blocks /_next
  // dev assets unless listed here — which leaves the SSR spinner hung forever.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
