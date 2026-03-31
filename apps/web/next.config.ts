import type { NextConfig } from "next";

const isStaticExport = process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : "standalone",
  basePath: isStaticExport ? "/autoparts-mvp" : "",
  trailingSlash: isStaticExport,
  images: isStaticExport ? { unoptimized: true } : {},
  transpilePackages: ["@autoparts/shared"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
