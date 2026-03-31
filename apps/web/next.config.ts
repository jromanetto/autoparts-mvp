import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@autoparts/shared"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
