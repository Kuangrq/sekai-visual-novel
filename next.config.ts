import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 优化图片处理
  images: {
    unoptimized: true, // 为静态导出优化，避免在 Vercel 上的图片处理问题
  },
  // 确保静态资源正确处理
  output: 'standalone', // 为 Vercel 部署优化
  // 启用实验性特性以提高性能
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },
};

export default nextConfig;
