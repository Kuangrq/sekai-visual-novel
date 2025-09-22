# 🚀 Vercel 部署指南

本指南将帮助你将 AI 视觉小说项目部署到 Vercel。

## 📋 部署前准备

### 1. 确保项目准备就绪
- ✅ 项目已经过构建优化
- ✅ Next.js 配置已优化以适配 Vercel
- ✅ 创建了 `vercel.json` 配置文件
- ✅ 添加了 `.vercelignore` 文件

### 2. 测试本地构建
```bash
cd visual-novel
npm run build
npm start
```

## 🌐 Vercel 部署步骤

### 方法 1：通过 Git 自动部署（推荐）

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "准备 Vercel 部署"
   git push origin main
   ```

2. **连接 Vercel**
   - 访问 [vercel.com](https://vercel.com)
   - 使用 GitHub 账号登录
   - 点击 "New Project"
   - 选择你的 GitHub 仓库

3. **配置项目设置**
   - **Framework Preset**: Next.js
   - **Root Directory**: `visual-novel`（重要！）
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

4. **环境变量（可选）**
   如果你计划添加真实的 LLM 集成，可以在 Vercel 仪表板中添加：
   ```
   OPENAI_API_KEY=your_key_here
   ANTHROPIC_API_KEY=your_key_here
   ```

5. **部署**
   - 点击 "Deploy"
   - 等待构建完成（通常 1-3 分钟）

### 方法 2：使用 Vercel CLI

1. **安装 Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署项目**
   ```bash
   cd visual-novel
   vercel --prod
   ```

4. **设置项目配置**
   - 当提示时，选择创建新项目
   - 确认项目设置

## 🔧 部署配置说明

### Next.js 配置优化
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // 为静态导出优化
  },
  output: 'standalone', // 为 Vercel 部署优化
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },
};
```

### Vercel 配置
- **最大函数执行时间**: 30秒（用于流式 API）
- **地区**: 香港/新加坡（优化中国用户访问）
- **缓存策略**: 静态资源长期缓存，API 无缓存

## 🎯 部署后验证

1. **检查主页**
   - 访问 Vercel 提供的 URL
   - 确认页面正常加载

2. **测试 API 端点**
   - 测试故事生成功能
   - 验证流式响应正常工作

3. **检查静态资源**
   - 确认角色头像正常显示
   - 验证背景图片加载

4. **测试交互功能**
   - 验证打字效果动画
   - 测试选择按钮功能

## 🛠️ 常见问题解决

### 构建失败
- 检查 `package.json` 中的依赖版本
- 确保 `visual-novel` 目录被正确设置为根目录

### 静态资源 404
- 确认文件路径正确
- 检查 `public` 目录结构

### API 路由错误
- 验证 Next.js 版本兼容性
- 检查流式响应头设置

### 性能优化
- 启用 Vercel Analytics（可选）
- 配置 CDN 缓存策略

## 📊 部署后监控

1. **Vercel Dashboard**
   - 查看部署状态和日志
   - 监控函数执行时间
   - 查看访问统计

2. **错误监控**
   - 检查 Functions 日志
   - 监控 4xx/5xx 错误

## 🎉 部署完成！

部署成功后，你将获得：
- 📱 响应式的视觉小说应用
- ⚡ 快速的流式文本生成
- 🎭 动态角色头像切换
- 🔄 实时交互选择系统

你的 Vercel URL 将类似于：`https://your-project-name.vercel.app`

---

**提示**: 每次推送到 main 分支，Vercel 都会自动重新部署你的应用！
