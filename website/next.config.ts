import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
