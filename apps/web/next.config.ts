import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@autoparts/shared"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
