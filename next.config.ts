import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  /**
   * 静态工具页：public/tools/datastruct 是无需构建的原生 HTML/JS 工具，
   * 用 rewrite 让 /tools/datastruct(/) 直达其 index.html（URL 保持不变）。
   */
  async rewrites() {
    return [
      { source: "/tools/datastruct", destination: "/tools/datastruct/index.html" },
      { source: "/tools/datastruct/", destination: "/tools/datastruct/index.html" },
    ];
  },
};

export default nextConfig;
