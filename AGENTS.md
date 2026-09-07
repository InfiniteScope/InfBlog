# AGENTS.md — InfBlog 项目上下文（跨 Harness 记忆）

> 本文件是跨 AI 编码工具（Kimi Code / OpenCode / Codex / Claude Code…）的项目记忆锚点。
> 静态约定另见 `docs/PROJECT.md`；本文件包含部署 runbook、踩坑记录与当前工作状态。
> **每次完成重要功能或部署后，务必更新本文的「当前状态」小节。**

## 项目概要

- Next.js 16 (App Router) + React 19 + Tailwind 4 + Prisma/SQLite + next-auth v5 的个人博客，部署于腾讯云轻量 Ubuntu。
- 本地：`D:\Laptop\MyProjects\InfBlog`；远端：`https://github.com/InfiniteScope/InfBlog`（main 分支）。
- 运行时站点：`https://infinitescope.site`（已 ICP 备案 + 公安备案，footer 悬挂）。

## 铁律（必须遵守）

1. **不主动部署服务器**：只有用户明确说"推服务器/部署"才执行部署流程；本地人工测试先行。
2. **勿覆盖用户手改文件**：`components/admin/avatar-uploader.tsx` 等用户改过文案的文件，除非明确要求，不要覆盖。
3. **schema 变更必须走 prisma migrate**（`migrate dev --create-only` 生成 → `migrate deploy` 应用），本地与服务器都要跑；`migrate deploy` 不会生成 client，需单独 `prisma generate`。
4. **内容文章以服务器为准**：`content/posts/*.mdx` 走 git，但服务器上可能直接新增（如 Tarjan 文章），部署时留意单独 scp；SQLite 运行时数据（评论/点赞/收藏/通知）以线上为准。
5. **MDX 安全写法**：表格/正文中的代码含 `< >`（如 `vector<int>`）必须用反引号包成行内代码，否则 MDX 当 JSX 解析 → 编译失败页面 500（浏览器显示 `ERROR <digest>`）。
6. **pnpm 被 shim 劫持**：本机用 `C:\Users\admin\AppData\Roaming\npm\pnpm.cmd` 直连。PowerShell 引号层层坑：复杂命令写脚本文件（UTF-8 无 BOM）scp 到服务器执行；多文件部署统一 tar+scp。
7. **typecheck/build 必过**：改完代码跑 `pnpm typecheck` 与 `pnpm build`（lint 脚本坏缺 eslint.config，忽略）。

## 服务器 Runbook（124.222.169.116 / root，SSH 免密）

- 应用：`/var/www/InfBlog`，PM2 进程名 `infblog`（`next start -p 3000`，非 standalone），2GB RAM。
- **服务器 git pull GitHub 不通**（GnuTLS -110）→ 部署用 **tar 打包改动文件 + scp**（本地 push origin 正常）：
  1. 本地 `git add/commit/push`
  2. `tar -czf deploy.tar.gz <改动文件列表>` → `scp` 到 `/tmp/`
  3. 服务器 `cd /var/www/InfBlog && tar -xzf /tmp/deploy.tar.gz`
  4. 新依赖 → `pnpm install`；schema 变更 → `pnpm exec prisma migrate deploy && pnpm exec prisma generate`
  5. `NODE_OPTIONS=--max-old-space-size=1536 pnpm exec next build`
  6. `pm2 restart infblog` → curl `localhost:3000` 与公网验证（服务器侧 `curl https://infinitescope.site/...`，本机直连公网可能不通）
- nginx（`/etc/nginx/sites-available/infblog`）：80 拒 IP+域名 301；443 ssl http2 → 127.0.0.1:3000；`/uploads/ /music/ /environment/` alias 直服（30d 缓存），上传新文件无需重启。
- 监控/运维：ufw(22/80/443) + fail2ban + netdata(19999 本机) + pm2-logrotate + GoAccess(`/var/www/infblog-goaccess.html` cron 每小时) + 每日备份 `/root/backup-infblog.sh`（03:30 SQLite×14，周日 04:00 music tar×14，备份后 music 只含 mp3）。
- 音乐已全部转码 320kbps mp3（原 FLAC 归档 `/var/www/music-flac-archive/`，1.9G）——勿再把大体积无损放回 `public/music/`（带宽瓶颈：播放时会吃满上行导致整站响应慢）。
- 资源图标自动本地缓存：`lib/resource-icon-cache.ts`（sharp ≤400×400 webp，ICO 原样），提交/更新/审核通过时自动执行；兜底脚本 `pnpm tsx scripts/cache-resource-icons.ts`。SSRF 防护已支持 IPv6 判定（`lib/favicon.ts`）。

## 领域要点

- **点赞**：登录用户按 `userId` 去重（PostLike.userId 可空 + `@@unique([userId, slug])`），匿名回退 IP+UA 指纹（visitorKey）；`hasLiked/likePost` 三参（slug, visitorKey, userId?）。
- **浏览量**：服务端限流每 IP+slug **10s** 一次（202 限流），客户端 sessionStorage 会话去重保留。
- **资源模块**：Tag/ResourceTag 关联（≤5 个/资源）、`?q=&tag=` 搜索筛选、评论（ResourceComment，强制登录）、`/resources/mine` 资源管理页、`POST /api/resources/meta` 抓官网图标+标题+简介、卡片名称右侧 Globe 官网按钮（span role=link 防 a 嵌套 a）。
- **推荐徽标**：`isOwnerPost` 钉选 + `author.role` 决定文案（ADMIN→管理员推荐，OWNER→站长推荐）。
- 推荐/编辑入口：评论表单等 server action 走 `useActionState`，带 resourceId 的签名需 `(resourceId, prevState, formData)` + `bind(null, resourceId)`。

## 当前状态（2026-09-07）

- 最新改动（本地已验证，**未部署服务器**）：修复「探索」主题对 moonshot.ai 的错解,并按用户要求进一步对齐官网——
  1. **月亮严格还原为日食环**：纯黑盘 + 细白环弧（全环 5% 底光、12 点热点 ±90° 渐隐、`--moon-spin` **100s/圈**、纯灰白无青色），删除钻石环珠点/8 颗星尘/青色 accent（moonshot 真实场景没有这些；逆向自其 UnicornStudio 场景 JSON：beam 层 radius .27H、fract(t*.01) 巡游、angularFading 90°、#D0D0D0 additive）。**尺寸 36vmin→54vmin**（≈0.54×屏高），`getMoonHome` R 同步 0.18→0.27。
  2. **文字扭曲改为 liquify 液态折射**：`GravityTitle` 双层文字（原始层 + `.hero-liquify-wrap` 拷贝层），拷贝层过 `#moon-liquify` SVG filter（feTurbulence 位移场 0.0022/0.02 横向拉丝 + feDisplacementMap scale 30 + R/B 通道 ±2.6px 反偏 feBlend screen 合成=色差），mask 以月心为圆心、半径 R*1.4 径向衰减（对应 liquify dist=max(0,1-d*4), mix .21）。GravityTitle 监听 html.ui-classic 的 MutationObserver——换肤后必须重算 mask，否则 mask 停兜底值导致整行标题被扭曲。
  3. **转场月亮 = 首页月亮（同一个 DOM）**：删除 canvas `drawMoon`（moon-home.ts 只剩 getMoonHome + MoonHandle）；转场引擎直接 WAAPI 驱动 `#hero-moon-rise`（classic→explore：月升 translateY(H*0.55+R)→0，1.5s cubic(0.16,1,0.3,1)，onfinish cancel 防残留；explore→classic：脉动 scale 0.97→1.03→1，霜幕后 opacity 0 退场）。夜幕改为月亮**下方**的 DOM veil 层（z-15 < 月 z-20 < 特效 canvas z-100），入夜氛围不暗化月体；月亮显隐由 `.ui-classic .v2-moon-layer{display:none}` + `.ui-theme-transitioning .v2-moon-layer{display:block}` 控制（后者必须写在后者之后以赢同级特异性）。非首页/窄屏转场无月亮（宽度 0 检测跳过）。
  4. **hero 对标 moonshot 版式（用户二次要求"抄官网设计"）**：探索 hero 恒黑夜景（`.v2-hero-night`，勿加 isolation/transform/filter——会自建层叠上下文把内部 z-10 文本关进 z-0 层输给 body 月 z-5！）+ 白色艺术大标题（`.v2-hero-title`，`text-[clamp(4.5rem,13vmin,12.5rem)]` 横穿月盘）+ 扫描线纹理（`.v2-hero-scanlines` z-7，在文字 z-10 下、月亮 z-5 上，模拟 retro_screen）+ **盘体不再遮字**：`.v2-moon-layer` z-index 20→5，文字（z-10）穿透月亮可见、盘内被 liquify 扭曲（moonshot 机理）。
  - 验收：typecheck/build 过；截图确认暗色/浅色（hero 恒黑）首页：白字大标题穿透月盘、盘内字母液态折射+色差、日食环、扫描线；月升帧、霜幕帧、转场结束态均正常。
- 鼠标引力保留：HeroMoon mousemove 牵拉（上限 26px、spring 42/14）广播 `hero-moon-move`，GravityTitle 重算字母弯折与 liquify mask。
- 服务器数据库已有 tag「工具」挂载在 7-zip 资源上。
- 已知小问题：`pnpm lint` 缺 eslint.config（历史遗留）；`next-env.d.ts` 会被 build 反复改动，提交前 `git checkout -- next-env.d.ts` 还原。
- 可选待办：部署服务器；备份/运维文档化；本站 MDX/KaTeX 公式速查文章。

## 常用文件地图

| 文件 | 作用 |
|---|---|
| `lib/post-stats.ts` | 浏览/点赞/收藏核心（visitorKey、userId 去重） |
| `lib/resources.ts` / `lib/resources-types.ts` | 资源查询（过滤/搜索/tags） |
| `app/resources/actions.ts` | 资源 server actions（含 tags 同步、评论） |
| `lib/resource-icon-cache.ts` / `lib/favicon.ts` | 图标缓存 + SSRF 防护抓取 |
| `lib/web-meta.ts` | 官网 meta 抓取（icon/title/description） |
| `components/resources/*` | 卡片（官网按钮/tags）、表单（tags/meta）、评论区、筛选 |
| `app/resources/mine/page.tsx` | 用户资源管理页 |
| `components/layout/{navbar,navbar-more,shell,user-menu}.tsx` | 顶栏（窄屏收起）、备案 footer、用户菜单 |
| `lib/rehype-style-object.ts` | KaTeX style→JSX 对象（公式 500 修复关键） |
| `components/motion/page-transition.tsx` | 转场（勿加 filter/blur，会破坏 fixed 定位） |
