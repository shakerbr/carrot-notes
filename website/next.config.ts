import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const websiteDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  // When website/ lives inside the carrot-notes repo, trace from website/ only
  // so Docker standalone output is not nested under website/ unnecessarily.
  outputFileTracingRoot: websiteDir,
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/install",
        destination: "/docs/install",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
