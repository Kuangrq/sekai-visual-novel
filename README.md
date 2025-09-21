# AI 视觉小说冒险

一个基于Next.js的AI驱动互动视觉小说项目，使用TypeScript和Tailwind CSS构建。

## ✨ 功能特色

### 🎮 核心功能
- **AI驱动的故事生成** - 实时生成的互动故事内容
- **流式文本显示** - 打字机效果的文本动画
- **动态角色系统** - 根据情绪变化的角色头像
- **互动选择系统** - 用户选择影响故事发展
- **响应式设计** - 适配各种设备屏幕

### 🎭 角色系统
项目包含4个主要角色，每个都有丰富的表情状态：
- **Lumine** (流萤) - 寻找答案的旅行者
- **Tartaglia** (达达利亚) - 热衷战斗的执行官
- **Venti** (温迪) - 隐藏身份的吟游诗人  
- **Zhongli** (钟离) - 拥有古老智慧的顾问

每个角色支持16种不同表情：中性、快乐、悲伤、愤怒、惊讶、思考、自信等。

### 🛠️ 技术架构

#### 前端技术
- **Next.js 14+** - React框架 (App Router)
- **TypeScript** - 类型安全的JavaScript
- **Tailwind CSS** - 实用优先的CSS框架
- **React Hooks** - 状态管理和副作用处理

#### 核心组件
- `VisualNovel` - 主要游戏界面组件
- `CharacterAvatar` - 动态角色头像系统
- `TypingText` - 打字机效果文本组件
- `XMLStreamParser` - XML流式解析器

#### 后端API
- `/api/story` - 故事内容流式API
- 模拟LLM响应的流式处理
- 结构化XML数据解析

## 🚀 快速开始

### 环境要求
- Node.js 18+ 
- npm 或 yarn
- 现代浏览器支持

### 安装依赖
```bash
npm install
```

### 开发模式启动
```bash
npm run dev
```

访问 `http://localhost:3000` 开始游戏

### 构建生产版本
```bash
npm run build
npm start
```

## 📁 项目结构

```
visual-novel/
├── src/
│   ├── app/
│   │   ├── api/story/          # 故事API路由
│   │   ├── globals.css         # 全局样式
│   │   ├── layout.tsx          # 根布局
│   │   └── page.tsx            # 主页面
│   ├── components/
│   │   ├── CharacterAvatar.tsx # 角色头像组件
│   │   ├── TypingText.tsx      # 打字机效果组件
│   │   └── VisualNovel.tsx     # 主游戏组件
│   └── lib/
│       └── xmlParser.ts        # XML解析工具
├── public/
│   ├── characters/             # 角色图片资源
│   │   ├── Lumine/
│   │   ├── Tartaglia/
│   │   ├── Venti/
│   │   └── Zhongli/
│   └── assets/
│       ├── background.jpg      # 背景图片
│       └── sample.xml          # 示例XML数据
└── README.md
```

## 🎯 核心技术实现

### XML流式解析
项目的核心挑战是实时解析LLM返回的结构化XML数据：

```typescript
// 示例XML格式
<character name="Lumine">
  <action expression="Happy">Standing gracefully</action>
  <say>It's rare to meet someone else who journeys between worlds.</say>
</character>
```

### 打字机效果
实现了可跳过的打字机动画效果：
- 字符逐个显示
- 可点击或按键跳过
- 支持多段文本连续显示

### 动态角色系统
根据XML中的表情属性动态切换角色头像：
- 平滑的过渡动画
- 16种表情状态支持
- 角色名称和状态显示

## 🎮 游戏流程

1. **故事开始** - 用户输入故事开头
2. **AI生成** - 后端流式返回故事内容
3. **文本显示** - 打字机效果逐字显示
4. **角色互动** - 根据对话显示相应角色和表情
5. **用户选择** - 提供多个故事分支选项
6. **故事继续** - 根据选择继续生成新内容

## 🔧 开发说明

### 添加新角色
1. 在 `public/characters/` 添加角色文件夹
2. 按照现有命名规范添加表情图片
3. 在 `CharacterAvatar.tsx` 中更新类型定义

### 扩展表情系统
1. 在 `emotionMap` 中添加新表情映射
2. 更新 `EmotionType` 类型定义
3. 确保对应的图片文件存在

### 自定义样式
项目使用Tailwind CSS，可以在组件中直接修改样式类，或在 `globals.css` 中添加自定义样式。

## 🚀 部署建议

### Vercel部署
```bash
npm install -g vercel
vercel
```

### 其他平台
项目是标准的Next.js应用，支持部署到：
- Netlify
- Railway
- AWS Amplify
- Google Cloud Platform

## 🎯 性能优化

- 使用Next.js Image组件优化图片加载
- 实现了组件级别的懒加载
- Tailwind CSS的PurgeCSS自动移除未使用样式
- TypeScript编译时优化

## 🔮 扩展建议

### 可选增强功能
- **真实LLM集成** - 接入OpenAI、Anthropic等API
- **音效系统** - 添加背景音乐和音效
- **存档功能** - 实现故事进度保存
- **更多动画** - 角色切换的高级动画效果
- **多语言支持** - 国际化功能

### 技术改进
- 添加单元测试 (Jest + Testing Library)
- 实现E2E测试 (Playwright)
- 添加状态管理 (Zustand/Redux Toolkit)
- 性能监控和分析

## 📄 开源协议

MIT License - 详见LICENSE文件

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork本项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

---

**享受AI驱动的视觉小说体验！** 🎮✨