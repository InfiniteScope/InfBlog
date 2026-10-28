import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
    /**
     * 客户端路由缓存：动态页面默认 0s（每次站内跳转都要重新取 RSC）。
     * 给 30s 后，30 秒内来回切换会直接命中客户端缓存，不再打服务端。
     * 代价：阅读量/点赞数最多旧 30 秒（可接受）。
     */
    staleTimes: {
      dynamic: 30,
      static: 180,
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
