# InfBlog 项目技术文档

> 本文档是 InfBlog 个人博客站点的最高优先级技术规格书。任何 AI 或开发者在参与本项目时，必须首先阅读本文档，并严格遵守其中的技术选型、设计规范与开发约定。

---

## 1. 项目定位

InfBlog 是一个面向技术/设计创作者的个人博客站点，核心需求包括：

- 展示个人信息、社交链接、工具与友链
- 发布技术/设计类博客文章（支持代码、图片、组件嵌入）
- 提供动态/留言墙与弹幕互动
- 呈现“简约 + 流畅动效 + 未来工业风”的视觉体验
- 优先本地开发验证，后续部署到自有服务器

---

## 2. 技术栈（已定案）

| 层级 | 选型 | 版本/说明 | 选用理由 |
|------|------|-----------|----------|
| **框架** | Next.js | 16.x，App Router | SSR/SSG 原生支持，MDX 集成成熟，React Server Components 降低客户端 JS |
| **语言** | TypeScript | 5.1+ | 类型安全，AI 协作时代码可控性更高 |
| **包管理器** | pnpm (via corepack) | 11.x | 当前环境 npm 调用异常，pnpm + 淘宝镜像可稳定安装 |
| **认证** | Auth.js (next-auth v5 beta) | 5.0.0-beta | 成熟框架，支持 Credentials Provider、JWT Session、角色注入 |
| **密码加密** | bcryptjs | 2.x | 安全哈希，无需原生依赖 |
| **样式** | Tailwind CSS | v4 | 原子化、Token 高度可控，远优于 Bootstrap，适合定制未来工业风 |
| **组件库-基础** | shadcn/ui | 最新 | 基于 Radix UI，Accessible、可复制源码、Tailwind 原生 |
| **组件库-装饰** | MagicUI / Aceternity UI / cult.ui | 按需复制 | 仅用于 Hero、背景、滚动揭示等视觉焦点，不替代 shadcn |
| **动画** | Motion (motion.dev) | 最新 | Framer Motion 继任者，弹簧物理、手势、布局动画一流 |
| **图标** | Lucide React | 最新 | 简洁一致、Tree-shake 友好 |
| **主题** | next-themes | 最新 | 深浅色无闪烁切换，支持系统偏好 |
| **状态管理** | Zustand + React Context | 最新 | 轻量，适合主题、搜索、弹幕等本地状态 |
| **博客内容** | MDX | 本地 `content/posts/` | 可嵌入 React 组件，Git 版本管理，无需 CMS |
| **搜索** | cmdk + fuse.js | 最新 | 命令面板 + 本地模糊搜索 |
| **代码高亮** | shiki | 最新 | 静态高亮，构建时运行，性能最佳 |
| **表单/校验** | react-hook-form + zod | 最新 | 类型安全表单，弹幕/留言/文章校验 |
| **Markdown 预览** | react-markdown | 9.x | 管理后台编辑器实时预览 |
| **通知** | Sonner | 最新 | Toast 通知 |
| **ORM** | Prisma | 6.x | 成熟、迁移完善、类型安全 |
| **数据库** | SQLite3 | 本地文件 `./data/blog.db` | 单节点部署友好，适合个人博客 |
| **字体-标题** | 得意黑 (Smiley Sans) | `@chinese-fonts/dyh` | 几何倾斜未来感 |
| **字体-正文** | Noto Sans SC + Inter | `@fontsource/noto-sans-sc`、`@fontsource/inter` | 离线可用，中文长文可读性高 |
| **字体-代码/数据** | JetBrains Mono | `@fontsource/jetbrains-mono` | 等宽，终端/档案感，呼应鹰角 HUD 风格 |

---

## 3. 设计风格与美学参考

### 3.1 参考站点分析

#### Apple (https://www.apple.com.cn/)

- **留白与网格**：大比例留白、强网格系统、内容居中。
- **字体层级**：标题大而紧凑（负字距），正文宽松行高，西文优先但中文适配良好。
- **材质与深度**：半透明面板、毛玻璃（`backdrop-blur`）、细腻阴影。
- **动效哲学**：即时反馈、1:1 手势跟踪、弹簧物理、可中断动画。
- **设计原则**：Purpose / Agency / Responsibility / Familiarity / Flexibility / Simplicity / Craft / Delight。

#### 鹰角网络 / 明日方舟 (https://ak.hypergryph.com/)

- **工业科幻美学**：深色背景、冷色强调、机械感边框、数据终端感。
- **中英混排**：大写英文作为装饰性标签，中文承载主要信息。
- **信息分层**：通过边框、透明度、等宽字体标签建立档案/终端感。
- **视觉密度**：顶部或侧边有 HUD 式信息条，整体精致但不杂乱。

#### 明日方舟：终末地 (https://endfield.hypergryph.com/)

- **沉浸式视觉**：全屏视频/大图、强烈世界观氛围。
- **技术 UI 元素**：细微网格、扫描线、角标、进度指示器。
- **叙事感排版**：标题与说明之间形成强烈主次对比。

### 3.2 InfBlog 设计方向

**关键词**：极简、流畅动效、未来工业、档案终端感。

- **色彩系统**：
  - 深色背景：`#0a0a0a` / `#111111`
  - 浅色背景：`#fafafa` / `#ffffff`
  - 强调色：`#3b82f6`（蓝）/ `#06b6d4`（青）/ `#8b5cf6`（紫，可选）
  - 边框：`rgba(255,255,255,0.08)`（暗色）/ `rgba(0,0,0,0.08)`（亮色）
  - 文字主色：`#fafafa`（暗色）/ `#171717`（亮色）
  - 文字次级：`#a1a1aa`（暗色）/ `#52525b`（亮色）

- **材质**：
  - 导航栏/侧边栏顶部使用 `backdrop-blur(16px)` + 半透明背景。
  - 卡片使用极细边框 + 微弱内阴影/背景渐变，避免扁平。
  - 大区域避免纯黑，使用 `#0a0a0a` 或细微噪点/网格纹理。

- **排版**：
  - 标题：得意黑，`tracking-tight`（-0.02em ~ -0.04em），行高 1.1 ~ 1.2。
  - 正文：Noto Sans SC + Inter，`tracking-normal`，行高 1.7 ~ 1.8。
  - 代码/标签/数据：JetBrains Mono，`tracking-wide` 视情况。
  - 英文装饰标签：全大写、字距放宽（`tracking-widest`）、小字号。

- **布局**：
  - 桌面端：左侧固定边栏（固定宽度，约 280px）+ 顶部固定导航 + 右侧主内容区。
  - 移动端：左侧边栏转为可滑出的 Sheet，或底部导航 + 顶部简化导航。
  - 内容区最大宽度 `max-w-3xl` 或 `max-w-4xl`，居中，保证阅读体验。

- **动效原则**（严格遵循 `.opencode/skills/animate` 与 `apple-design`）：
  - 默认弹簧：`type: "spring", bounce: 0, duration: 0.4`（Apple 式临界阻尼）。
  - 手势/拖拽释放可少量 `bounce: 0.2`。
  - UI 动画时长控制在 150–300ms，营销/首屏可稍长。
  - 进入动画使用 `translateY(20px) + opacity: 0` → `translateY(0) + opacity: 1`，避免 `scale(0)`。
  - 锚定元素（如下拉菜单、Tooltip）动画原点对准触发元素。
  - 必须处理 `prefers-reduced-motion`：高运动用户改用 opacity 淡入淡出。
  - 高频操作（如导航切换、搜索打开）不应加动画或只用 100ms 内反馈。

---

## 4. 页面与布局结构

参考 `docs/整体布局.png`，整体为 **左侧固定边栏 + 顶部固定导航 + 右侧主内容** 结构。

### 4.1 左侧边栏（桌面端固定，移动端可收起）

从上到下：

1. **头像区**：圆形/圆角矩形头像 + 昵称 + 占位按钮
2. **个人信息卡**：姓名、邮箱、地址、学籍等（可配置）
3. **GitHub 主页跳转**：外链按钮
4. **工具链接 & 友情链接展示**：列表或标签云
5. **弹幕滚动区**：实时/模拟弹幕横向滚动展示
6. **弹幕输入框 + 发送按钮**：用户可发送弹幕

### 4.2 顶部导航栏

左侧：LOGO/站点名（可选）
中间/左侧主导航：
- 首页
- 博客
- 动态
- 留言墙
- 关于

右侧：
- 搜索（点击展开 cmdk 命令面板）
- 深浅色模式切换
- 用户信息/登录（如需要，先占位）

### 4.3 主内容区

根据路由展示不同内容：
- `/`：首页 Hero + 最新文章 + 精选动态
- `/blog`：博客列表（支持标签/分类筛选）
- `/blog/[slug]`：博客详情（MDX 渲染、TOC、代码高亮、上下篇导航）
- `/updates`：动态时间线
- `/resources`：资源分享（卡片列表 + 上传）
- `/resources/[id]`：资源详情（MDX 简介、官网/下载链接）
- `/messages`：个人消息（资源审核通知）
- `/guestbook`：留言墙
- `/about`：关于我
- `/admin/posts`：博客管理后台（列表/新建/编辑/删除）
- `/admin/posts/new`：新建文章
- `/admin/posts/[slug]`：编辑文章
- `/admin/resources`：资源审核（通过/拒绝访客提交）
- `/admin/users`：用户权限管理（仅站长可见）
- `/login`：登录
- `/register`：注册

---

## 5. 目录结构

```
InfBlog/
├── .opencode/                # 前端设计技能
├── app/                      # Next.js App Router
│   ├── layout.tsx            # 根布局：字体、主题、Shell
│   ├── page.tsx              # 首页
│   ├── globals.css           # Tailwind v4 + CSS 变量
│   ├── blog/
│   │   ├── page.tsx          # 博客列表
│   │   └── [slug]/
│   │       └── page.tsx      # 博客详情
│   ├── updates/
│   │   └── page.tsx          # 动态时间线
│   ├── guestbook/
│   │   ├── page.tsx          # 留言墙
│   │   ├── actions.ts        # Server Actions
│   │   └── guestbook-form.tsx
│   ├── about/
│   │   └── page.tsx          # 关于
│   ├── admin/
│   │   ├── layout.tsx        # 管理后台布局
│   │   ├── actions.ts        # 文章 CRUD Server Actions
│   │   ├── posts/
│   │   │   ├── page.tsx      # 文章列表
│   │   │   ├── new/
│   │   │   │   └── page.tsx  # 新建文章
│   │   │   └── [slug]/
│   │   │       └── page.tsx  # 编辑文章
│   │   └── users/
│   │       └── page.tsx      # 用户权限管理（仅站长）
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts  # Auth.js API 路由
│   ├── login/
│   │   └── page.tsx          # 登录页
│   ├── register/
│   │   └── page.tsx          # 注册页
│   └── danmu/
│       └── actions.ts        # 弹幕 Server Actions
├── components/
│   ├── ui/                   # shadcn/ui 组件
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── command.tsx
│   │   ├── sheet.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── avatar.tsx
│   │   ├── separator.tsx
│   │   ├── scroll-area.tsx
│   │   └── sonner.tsx
│   ├── layout/               # Sidebar、Navbar、Shell
│   ├── admin/                # 管理后台组件
│   │   ├── mdx-editor.tsx    # Split-pane MDX 编辑器
│   │   ├── post-form.tsx     # 文章表单
│   │   ├── remove-post-button.tsx
│   │   └── user-role-form.tsx
│   ├── blog/                 # 博客相关
│   │   └── write-blog-button.tsx
│   ├── danmu/                # DanmuList、DanmuForm
│   ├── motion/               # PageTransition、StaggerContainer
│   ├── mdx-components.tsx    # MDX 渲染组件
│   ├── session-provider.tsx  # next-auth SessionProvider 包装
│   ├── theme-provider.tsx
│   ├── theme-toggle.tsx
│   └── search-command.tsx
├── content/
│   └── posts/                # MDX 博客文章
├── lib/
│   ├── prisma.ts             # Prisma Client 单例
│   ├── utils.ts              # cn 工具
│   ├── mdx.ts                # MDX 解析
│   └── config.ts             # 站点配置
├── prisma/
│   ├── schema.prisma         # Prisma 数据模型
│   └── migrations/           # 数据库迁移文件（需提交）
├── public/
│   └── images/               # 静态图片
├── data/
│   └── blog.db               # SQLite 数据库文件（gitignored）
├── .env                      # 本地环境变量（gitignored）
├── .env.example              # 环境变量模板
├── .npmrc                    # pnpm 构建脚本白名单
├── auth.ts                   # Auth.js 配置
├── proxy.ts                  # Next.js 16 路由保护（原 middleware）
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── types/
│   └── next-auth.d.ts        # Session/JWT 类型扩展
├── package.json
├── pnpm-lock.yaml
└── docs/
    └── PROJECT.md            # 项目主文档
```

---

## 6. 数据库设计

使用 **SQLite + Prisma**。数据库文件位于 `./data/blog.db`，但 `DATABASE_URL` 需写成 `file:../data/blog.db`（Prisma 以 `prisma/schema.prisma` 所在目录解析相对路径）。

### 6.1 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model GuestbookMessage {
  id        Int      @id @default(autoincrement())
  author    String
  content   String
  email     String?  // 可选，不公开显示
  website   String?  // 可选个人主页
  isPublic  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Danmu {
  id        Int      @id @default(autoincrement())
  content   String
  color     String   @default("#ffffff") // 弹幕颜色
  speed     Int      @default(1)         // 速度等级 1-3
  createdAt DateTime @default(now())
}
```

### 6.2 环境变量

```bash
# .env
DATABASE_URL="file:../data/blog.db"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_TITLE="InfBlog"
NEXT_PUBLIC_SITE_DESCRIPTION="一个关于技术与设计的个人博客"
```

> 注意：Prisma CLI 默认读取 `.env`，Next.js 会同时加载 `.env` 与 `.env.local`。本地开发可直接使用 `.env`，并通过 `.env.example` 作为模板。生产环境请在服务器上设置对应变量。

### 6.3 初始化命令

```bash
# 安装依赖（当前环境使用 pnpm + corepack）
pnpm install

# 生成 Prisma Client
pnpm exec prisma generate

# 创建数据库并执行迁移
pnpm exec prisma migrate dev --name init

# 可选：打开 Prisma Studio 管理数据
pnpm exec prisma studio
```

> 坑：Windows 下 `prisma generate` 报 EPERM 时，先停掉占用 node_modules/prisma 的 node 进程（`Get-Process node | Stop-Process -Force`）再跑。

---

## 7. 内容管理

博客文章采用 **MDX** 格式存储在 `content/posts/`，并通过管理后台进行 CRUD 操作。

### 7.1 编辑器选型

| 方案 | 说明 | 本项目选择 |
|------|------|-----------|
| WYSIWYG（如 Novel、Tiptap） | 可视化编辑，上手快，但对 MDX/JSX 支持有限，体积大 | 未采用 |
| Monaco / CodeMirror | 代码编辑器，适合纯 Markdown，但无实时预览 | 未采用 |
| **Split-pane 编辑器** | 左侧 textarea 写 MDX，右侧 `react-markdown` 实时预览 | **采用** |

选择 split-pane 的原因：
- 完全兼容 MDX（可写 JSX 组件、frontmatter）
- 轻量，无需引入重型编辑器依赖
- 与站点的技术/工业风格一致
- 源码可控，便于版本管理

### 7.2 管理后台路由

- `/admin/posts`：文章列表 + 删除
- `/admin/posts/new`：新建文章
- `/admin/posts/[slug]`：编辑文章

### 7.3 文章 Frontmatter

```yaml
---
title: "文章标题"
date: "2026-08-18T12:00:00.000Z"
description: "文章简介"
tags: ["标签1", "标签2"]
---
```

### 7.4 发布流程

1. 在 `/admin/posts/new` 填写标题、描述、标签、MDX 正文
2. 右侧实时预览 Markdown 渲染效果
3. 点击"发布文章"，Server Action 将文件写入 `content/posts/{slug}.mdx`
4. `revalidatePath` 自动刷新首页、博客列表、搜索面板

> 注意：MDX 中的自定义 JSX 组件在编辑器预览中不会渲染（`react-markdown` 只处理标准 Markdown），以实际页面渲染为准。

---

## 8. 用户认证与权限系统

### 8.1 技术选型

使用 **Auth.js v5 (next-auth beta)** + **Prisma Adapter** + **bcryptjs**：
- Auth.js 是 Next.js 生态最成熟的认证框架，避免重复造轮子
- Credentials Provider 实现用户名/密码登录
- JWT Session 策略，将角色注入 token 和 session
- Prisma Adapter 管理 User / Account / Session / VerificationToken 表

### 8.2 权限等级

| 角色 | 数据库值 | 权限 |
|------|---------|------|
| 站长 | `OWNER` | 管理后台、发布/编辑/删除博客、调整用户权限 |
| 管理员 | `ADMIN` | 管理后台、发布/编辑/删除博客 |
| 访客 | `VISITOR` | 仅浏览、留言、发弹幕 |

新注册用户默认角色为 `VISITOR`。

### 8.3 注册校验规则

- 用户名：长于 6 个字符（≥7），只能包含字母、数字、下划线
- 密码：多于 6 个字符（≥7），必须包含大写字母、小写字母、数字、下划线中的至少两类
- 密码区分大小写，使用 bcryptjs 哈希后存储

### 8.4 预存站长账号

系统预存站长账号：`InfiniteScope`。密码通过环境变量在 seed 时注入，**不硬编码在代码中**。

```bash
# Windows PowerShell
$env:SEED_OWNER_PASSWORD="your-password"
pnpm exec tsx prisma/seed.ts
```

或配置到 `.env` 后执行：

```bash
pnpm db:seed
```

> 密码只以 bcrypt 哈希形式保存在数据库中，代码与 Git 历史中不会出现明文。

### 8.5 受保护路由

Next.js 16 使用 `proxy.ts`（原 `middleware.ts`）保护 `/admin/:path*`：
- 未登录 → 重定向到 `/login`
- 登录但非站长/管理员 → 重定向到首页
- `/admin/users` 页面额外校验仅站长可访问

### 8.6 站长书写入口

在 `/blog` 及 `/blog/[slug]` 页面右下角显示固定悬浮按钮"书写博客"，仅当 `session.user.role === "OWNER"` 时渲染，点击跳转 `/admin/posts/new`。

---

## 9. 开发规范与 AI 易错点

### 9.1 样式规范

- **只用 Tailwind CSS**，禁止引入 Bootstrap。
- 使用 `cn()` 工具函数合并类名（来自 shadcn 模板）。
- 颜色优先使用 CSS 变量/Tailwind Token，避免硬编码 `#1a1a1a` 等零散色值。
- 响应式断点：移动优先，默认小屏，逐步扩展 `md:` / `lg:` / `xl:`。
- 间距使用 Tailwind 标准 scale，避免随机 `px` 值。

### 9.2 组件规范

- shadcn/ui 负责所有需要复杂交互/可访问性的组件：Button、Dialog、Sheet、DropdownMenu、Command、Input、Textarea、Select、Tabs、Tooltip、ScrollArea。
- MagicUI/Aceternity 组件只用于视觉装饰，且必须先定义好 Design Token 再接入，禁止直接堆叠。
- 所有组件默认导出为命名清晰的函数组件，Props 必须类型化。
- 组件文件不超过 300 行，过长应拆分。

### 9.3 动画规范

- 优先使用 Motion；简单 hover/press 用 CSS transition。
- 禁止：
  - `transition: all`
  - `transform: scale(0)` 入场
  - `ease-in` 用于 UI 元素
  - UI 动画超过 300ms 无特殊理由
  - 动画 `width`/`height`/`margin`/`padding`/`top`/`left`
  - 高频操作加动画
- 必须：
  - 为所有运动组件提供 `prefers-reduced-motion` 降级。
  - 触摸设备 hover 动画加 `@media (hover: hover) and (pointer: fine)` 门控。

### 9.4 字体规范

- 标题：`font-display`（得意黑）
- 正文：`font-sans`（Noto Sans SC + Inter）
- 代码/数据：`font-mono`（JetBrains Mono）
- 配置 Tailwind `fontFamily`：

```css
/* app/globals.css 中 @theme inline 内定义 */
--font-sans: var(--font-inter), var(--font-noto-sans-sc), system-ui, -apple-system, sans-serif;
--font-display: "SmileySans-Oblique", var(--font-inter), var(--font-noto-sans-sc), sans-serif;
--font-mono: var(--font-jetbrains-mono), ui-monospace, monospace;
```

### 9.5 MDX / 博客规范

- 文章 Frontmatter 必须包含：`title`、`date`、`description`、`slug`、`tags`。
- 图片放在 `public/images/posts/` 或远程 CDN，MDX 中引用使用相对 `/images/posts/...` 路径。
- 代码块使用 ``` 语法，shiki 会在构建时高亮。
- 目录（TOC）基于 H2/H3 自动生成。

### 9.6 数据库 / Server Actions 规范

- 所有数据库操作通过 Next.js Server Actions 或 API Route 完成。
- 表单提交必须 Server-Side 校验（zod）。
- 文章 CRUD 同样走 Server Actions，直接写入 `content/posts/`。
- Prisma Client 使用单例模式（`lib/prisma.ts`），避免开发时热更新创建多个实例。
- 留言/弹幕默认需要简单防刷（如 IP 限速或验证码），初期可先不做，但架构要预留。

### 9.7 AI 协作常见错误

| 错误 | 正确做法 |
|------|----------|
| 直接用 Bootstrap 或原生 CSS 写大量样式 | 全部用 Tailwind + Design Token |
| 把 MagicUI 组件直接当基础组件堆满全站 | 只在视觉焦点处使用，底层用 shadcn |
| 所有元素都加复杂进入动画 | 按频率分级，高频无动画，低频适度 |
| 忽略 `prefers-reduced-motion` | 每个动效都提供降级 |
| 中文字体只配置西文字体 | 必须回退 Noto Sans SC / 系统字体 |
| Server Action 里每次新建 Prisma Client | 使用 `lib/prisma.ts` 单例 |
| 把 SQLite 数据库提交到 Git | 加入 `.gitignore`，迁移文件提交 |
| 忽略移动端侧边栏 | 小屏必须提供 Sheet/抽屉或底部导航 |
| 动效使用 `x`/`y`/`scale` shorthand 导致掉帧 | Motion 中使用完整 `transform` 字符串 |
| 在 Client Component 里直接 `await` 调 Server Action 取数据 | 在 Server Component/Shell 取数据后通过 props 传入 |
| 使用 `next/font/google` 在网络受限环境构建失败 | 改用 `@fontsource/*` 包离线加载字体 |
| 客户端页面直接访问 `searchParams.xxx`（同步动态 API 报错） | Next.js 16 中 `searchParams` 是 **Promise**，必须 `React.use()` 解包后再访问 |
| 把 `useSession().update` 放进 `useEffect` 依赖数组（无限 csrf/session 循环） | next-auth v5 beta 中 `update` 身份不稳定，必须配合 `useRef` 一次性守卫 |
| Windows 下 `prisma generate` 报 `EPERM rename query_engine-windows.dll.node` | 先停掉项目相关的残留 `node` 进程（如 dev server），再执行 `pnpm exec prisma generate` |

### 9.8 认证会话常见故障排查

#### 故障现象：登录后 / 修改昵称后，日志出现无限循环

```text
GET /api/auth/csrf 200 ... 
POST /api/auth/session 200 ...
GET /api/auth/csrf 200 ...（反复出现）
```

#### 根因

next-auth v5 beta 的 `useSession().update` **身份不稳定**：
- 每次 session 刷新（`SessionProvider` 内部 setSession）都会生成一个新的 `update` 函数引用；
- 若在 `useEffect` 依赖数组中写入 `update`（如 `[state, update]`），则 `update()` 触发 session 刷新 → `update` 引用变化 → effect 重新执行 → 再次 `update()`，形成无限循环。

#### 正确写法（一次性守卫）

```tsx
import { useRef } from "react"

// 组件内：
const syncedRef = useRef(false)

useEffect(() => {
  if (state?.success && !syncedRef.current) {
    syncedRef.current = true
    update({ nickname })   // 只触发一次
  }
}, [state, update])
```

#### 排查清单

1. 检查是否有 `useEffect` 依赖 `update`（`useSession` 解构）——必须加 `useRef` 守卫。
2. 检查客户端页面是否直接访问 `searchParams.xxx`——必须 `React.use()` 解包（`app/login`、`app/register` 曾出现）。
3. `POST /api/auth/session` 由 `update()` 触发；`GET /api/auth/csrf` 是 `update()` 的第一步。两者成对出现且无法停止即为循环。

---

## 10. 部署流程

### 10.1 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 DATABASE_URL、SEED_OWNER_PASSWORD 等

# 3. 初始化数据库
pnpm exec prisma migrate dev --name init

# 4. 创建站长账号（首次安装时执行）
$env:SEED_OWNER_PASSWORD="your-password"  # Windows PowerShell
pnpm db:seed

# 5. 启动开发服务器
pnpm dev
```

### 10.2 构建与预览

```bash
pnpm build
pnpm start
```

### 10.3 服务器部署

- 目标环境：自有服务器 / VPS（推荐 Docker 或 PM2）。
- Next.js 输出模式：默认 `standalone` 已在 `next.config.ts` 中开启，减小体积。
- 确保 `./data/` 目录可写，SQLite 文件不会被删除。
- 确保 `content/posts/` 目录可写，管理后台才能发布/编辑文章。
- 使用 Nginx/Caddy 做反向代理 + HTTPS。
- 环境变量在服务器上配置，不提交到代码仓库。

### 10.4 构建自检要求

每次增删改代码后，必须执行以下自检并通过方可交付：

```bash
pnpm build
```

构建需同时满足：
- TypeScript 类型检查无错误
- 静态页面生成成功
- 无模块未找到（Module not found）错误
- 无关键运行时错误

如改动涉及数据库，额外执行：

```bash
pnpm exec prisma generate
pnpm exec prisma migrate dev
```

### 10.5 注意事项

- **SQLite 不适合 Serverless/Vercel**：如果未来迁移到 Vercel，需要切换到 PostgreSQL（如 Supabase、Neon）或 Turso。
- 数据库迁移文件（`prisma/migrations/`）需要提交到 Git，但 `data/blog.db` 必须 `.gitignore`。
- `.env` 包含本地数据库路径、站长 seed 密码等敏感配置，必须 `.gitignore`，只提交 `.env.example`。
- 管理后台直接写入文件系统，**不适合只读文件系统的 Serverless 环境**。

---

## 11. 站点彩蛋与收藏品系统

娱乐玩法：点击「点我试试」等触发彩蛋，收集「网站藏品」（three.js 像素风立体模型）。

### 11.1 彩蛋概率（ChillButton）

| 触发 | 概率 | 效果 |
|------|------|------|
| 头像碎裂 | 5% | 左上角站长头像碎片四散，10s 后复原（`SHATTER_EVENT` 事件驱动，`ShatterAvatar` 监听） |
| 火箭发射 | 5% | 按钮上方飞出小火箭升天 |
| Banana | 1% | 掉落普通香蕉（需登录） |
| BubbleBanana | 0.1% | 掉现金色香蕉（需登录） |

### 11.2 收藏品列表

| itemId | 名称 | 获得方式 | 稀有度 |
|--------|------|---------|--------|
| `banana` | Banana | 点按钮 1% | common |
| `bubble-banana` | BubbleBanana | 点按钮 0.1% | legendary |
| `sharing-hero` | Sharing?Hero. | 首次提交资源（服务端授予，无需审核） | rare |
| `listener` | Listener... | 音乐累计播放 30min（localStorage 持久） | rare |
| `reader` | Reader...? | 博客阅读累计 30min（页面可见+活跃） | rare |

### 11.3 数据结构与路由

- `UserCollectible`（Prisma）：`userId + itemId` 唯一索引，幂等授予。
- `GET /api/collectibles/mine`：当前用户收藏列表。
- `POST /api/collectibles/claim`：领取（401 未登录 / 400 非法 id / 幂等）。
- `lib/collectibles.ts`：藏品元数据（`CollectibleId` 联合类型 + `COLLECTIBLE_MAP`）。
- `lib/collectibles-grant.ts`：服务端幂等授予（资源提交用）。
- `lib/collectibles-client.ts`：客户端领取/查询 + `notifyCollectible(itemId)`（toast + 中央弹窗）。
- `components/collectibles/collectible-viewer.tsx`：**基于 @react-three/fiber + drei**（bruno-simon.com 同款方案）：
  - `OrbitControls`（damping + autoRotate + 目标点居中，拖拽围绕模型中轴旋转）
  - `<Center bottom>` 自动包围盒水平居中，垂直贴地；`<Float>` 悬浮呼吸；`<ContactShadows>` 软阴影
  - **资产策略**：现成 CC0 低多边形 gltf（pmndrs/market-assets，全部内嵌 base64 无外部依赖，总量 <5MB）：
    - Banana / BubbleBanana → `models/banana.gltf`（BubbleBanana = clone + 金色金属材质替换）
    - Listener… → `models/turntable.gltf` + `models/headphones.gltf`（Float 悬浮组合）
    - `useGLTF` 自带缓存 + Suspense 包裹
  - 无现成资产的两件为程序化 PBR：Sharing?Hero.（LatheGeometry 旋转杯体 + Torus 双耳 + 宝石）、Reader（RoundedBox 开卷书 + 眼镜 Torus/镜片）
  - **材质/灯光标准（threejs-skills）**：`Environment preset="city"` 提供 PBR 反射贴图、`ACESFilmicToneMapping` 色调映射、半球光 + 主光阴影 + 补光三灯、`gl.toneMappingExposure=1.1`
- `components/collectibles/collectible-reveal.tsx`：获得新藏品时**屏幕正中央**全屏弹窗（300px 大模型，可拖拽旋转），监听 `collectible:reveal` 事件，挂在根布局。
- `components/collectibles/shatter-avatar.tsx`：头像碎裂（`chill:avatar-shatter` 事件）。
- `components/collectibles/reading-tracker.tsx`：博客页阅读计时（活动检测 60s）。
- `components/collectibles/collectibles-dialog.tsx` + `collectible-grid.tsx`：藏品网格（小卡自动旋转预览）/ 详情（**选中后 180px 大图可拖拽**）；`catalog` 模式给 admin 看全部。
- UserMenu：登录用户有 ≥1 件藏品时显示「网站藏品」（奖杯图标）；OWNER/ADMIN 另有「藏品图鉴」。
- 授予后 `sonner` toast 提示，Toaster 挂在根布局。

### 11.4 已知实现细节

- Listener 计时：MusicProvider 内 30s 间隔检查 `audio.paused`，进度存 `localStorage[collectible:listener:seconds]`，达标后 API 幂等领取并置 `claimed` flag。
- Reader 计时：仅当页面可见 + 60s 内有交互时计入。
- R3F 仅客户端运行（viewer 是 client 组件），`@react-three/drei` 提供 OrbitControls/Center/Float/ContactShadows，无需引入外部 glTF 资产。
- 获得藏品流程：chill 按钮/计时器 → claim API → `notifyCollectible(itemId)` → toast + `collectible:reveal` → 「获得新藏品」中央弹窗。若已拥有（newlyClaimed=false）不弹窗。

---

## 12. 后续扩展建议

- **评论系统**：当前留言墙 + 弹幕足够；未来可接入 Giscus（GitHub Discussions）作为文章评论。
- **RSS / Sitemap**：Next.js 可生成 `/rss.xml` 和 `/sitemap.xml`。
- **Open Graph**：每篇文章生成动态 OG 图片（使用 `@vercel/og`）。
- **搜索增强**：Command 面板已接入文章搜索；文章量大后可接入 Algolia。
- **后台认证**：当前已用 Auth.js 实现基于角色的权限；如需更严格的认证可接入 OAuth。
- **国际化**：当前中文为主；未来如需英文，可用 `next-intl`。
- **收藏品扩展**：新藏品只需在 `lib/collectibles.ts` 注册 + `lib/voxel-models.ts` 加模型。

---

## 13. 参考与致谢

- 设计美学参考：Apple、Hypergryph（明日方舟 / 终末地官网）
- 动画规范来源：`.opencode/skills/apple-design`、`animate`、`improve-animations`
- UI 选型来源：`.opencode/skills/pick-ui-library`、`ui-ux-pro-max`

---

*文档版本：v1.4*
*最后更新：2026-08-23*
*维护者：InfBlog 项目团队*
