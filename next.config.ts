import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 优化图片处理 - 修复 Vercel 部署后的图片问题
  images: {
    unoptimized: false, // 启用 Next.js 图片优化
    domains: [], // 如果需要外部图片域名
    formats: ['image/webp', 'image/avif'], // 启用现代图片格式
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // 确保静态资源正确处理
  output: 'standalone', // 为 Vercel 部署优化
  // 启用实验性特性以提高性能
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },
  // 压缩和优化
  compress: true,
  // 设置turbopack根目录以解决多lockfile警告
  turbopack: {
    root: '.',
  },
};

export default nextConfig;
