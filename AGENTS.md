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
4. **内容文章以服务器为准（单向：云端 → 本地）**：**用户主要在服务器端写文章，本地 `content/` 永远落后于线上**。因此：
   - **绝不要把本地 `content/` 往服务器推/覆盖**（会吃掉线上更新的版本，历史教训：`java面试八股` 的 `updatedAt` 差点被倒退 3 天）。
   - 需要同步时方向是**从服务器拉回本地**（注意 Windows bsdtar 解不了 Linux 的 UTF-8 中文名 tar，须用 Python tarfile 解压）。
   - 部署只需同步**代码**；`content/posts|updates|docs/*.mdx`、`data/blog.db`、`public/uploads` 一律不动。
   - 唯二例外：**服务器上不存在的全新本地文件**（例如从未上线过的档案）可以单独 scp 上去；`formula-test.mdx` 这类本地调试用的测试文章**永远不部署**。
   - **不要再为"要不要带上本地内容改动"问用户**——默认答案是"不带"。
5. **MDX 安全写法**：表格/正文中的代码含 `< >`（如 `vector<int>`）必须用反引号包成行内代码，否则 MDX 当 JSX 解析 → 编译失败页面 500（浏览器显示 `ERROR <digest>`）。**尖括号自动链接 `<https://x>` 在 MDX 中不合法**（标准 Markdown 合法但 MDX 会报 "Unexpected character before local name"）——已加 `lib/mdx-normalize.ts` 渲染前归一化（尖括号链接→Markdown 链接、裸 `<br>`→`<br />`，跳过代码围栏/行内代码）；文章页与文库页均已接入。写文时仍建议直接用 `[url](url)` 或裸 URL。
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
- **nginx 压缩（2026-10-07 已开，别再退回）**：`/etc/nginx/nginx.conf` 原样只压缩 `text/html`（`gzip_types` 整行被注释），导致 **JS/CSS 完全不压缩**（全站 2.6MB JS + 491KB CSS 走明文）。现已改为：`gzip on; gzip_vary on; gzip_proxied any; gzip_comp_level 5; gzip_min_length 1024;` + `gzip_types` 覆盖 `text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss image/svg+xml application/wasm font/woff2 application/manifest+json`。**`gzip_proxied any` 是关键**——Next 在 nginx 后面，不设它代理响应不会被压缩。实测 JS -71.7%、CSS -83.4%、`/docs` HTML 264KB→81KB。备份在 `/root/nginx.conf.bak-*`。
- **本机还存在的其他服务（不要误当成博客的一部分）**：bizbot 全家桶已于 2026-10-07 关停（见下）；**宝塔面板（BT Panel）装在 `/www/server/`**，`bt.service` 与 `php-fpm-82` 是 inactive dead，但它的 MySQL（`/www/server/mysql`，`mysqld.service`，**开机自启**）仍在跑，占 ~160MB 内存 + ~152MB swap，监听 `*:3306`（ufw 未放行 → 外网被拦）。这个不属于博客，**未经用户确认不要停**。另有 netdata(19999, ~160MB)、YDService/barad_agent（腾讯云镜/监控代理）、pure-ftpd(21)、dockerd/containerd。
- 音乐已全部转码 320kbps mp3（原 FLAC 归档 `/var/www/music-flac-archive/`，1.9G）——勿再把大体积无损放回 `public/music/`（带宽瓶颈：播放时会吃满上行导致整站响应慢）。
- 资源图标自动本地缓存：`lib/resource-icon-cache.ts`（sharp ≤400×400 webp，ICO 原样），提交/更新/审核通过时自动执行；兜底脚本 `pnpm tsx scripts/cache-resource-icons.ts`。SSRF 防护已支持 IPv6 判定（`lib/favicon.ts`）。

## 领域要点

- **点赞**：登录用户按 `userId` 去重（PostLike.userId 可空 + `@@unique([userId, slug])`），匿名回退 IP+UA 指纹（visitorKey）；`hasLiked/likePost` 三参（slug, visitorKey, userId?）。
- **浏览量**：服务端限流每 IP+slug **10s** 一次（202 限流），客户端 sessionStorage 会话去重保留。
- **资源模块**：Tag/ResourceTag 关联（≤5 个/资源）、`?q=&tag=` 搜索筛选、评论（ResourceComment，强制登录）、`/resources/mine` 资源管理页、`POST /api/resources/meta` 抓官网图标+标题+简介、卡片名称右侧 Globe 官网按钮（span role=link 防 a 嵌套 a）。
- **推荐徽标**：`isOwnerPost` 钉选 + `author.role` 决定文案（ADMIN→管理员推荐，OWNER→站长推荐）。
- 推荐/编辑入口：评论表单等 server action 走 `useActionState`，带 resourceId 的签名需 `(resourceId, prevState, formData)` + `bind(null, resourceId)`。
- **提交入口限流**：`lib/rate-limit.ts` 的 `createWaitLimiter`（等待式限流，返回 `retryAfterMs` 供 UI 倒计时；窗口内静默超时自动清零）与 `createRateLimiter`（次数式，新增 `retryAfterMs/clear`）。弹幕 `miniFree=3 / 3s / 5min`、留言墙 `2 / 15s / 5min`（均按 IP+UA 指纹 visitorKey）；资源评论 `3 / 10s / 5min`（按 userId，已有登录门禁）；注册 `3 次/10min`、登录 `6 次/1min`（按 IP，走 `clientIpFromHeaders(await headers())`，成功后 `clear` 清零）。限流态只由客户端倒计时负责显示，倒计时结束提示必须一起消失（不能回落到 `state.error`）。
- **简介支持内联 Markdown**：`lib/mdx-inline.ts`（纯函数 `parseInline`/`stripMarkdown`/`hasInlineMarkdown`）+ `components/ui/mdx-inline.tsx`（`MdxInline`/`MdxInlineSpan`；无 `"use client"`、无 `dangerouslySetInnerHTML`）。支持 `**粗体**`、`*斜体*`、行内代码、`~~删除线~~`、`[链接](url)`、换行；块级语法不支持。接入 7 处渲染（首页 FEATURED/文章行、`/blog` 双主题、文章详情、`/docs` 列表、文库详情）；**meta description 与 `/feed.xml` 必须走 `stripMarkdown()`**（否则搜索结果/RSS 会露出 `**` 与 `()`）。编辑器「描述」框带语法提示 + 实时预览。**`MdxInline` 自身就是 `<p>`，不要再套 `<p>`**（非法嵌套）；链接协议白名单只放行 `http(s)/mailto/tel//#`，其余整段按字面显示。
- **日期时间展示**：统一走 `lib/format-date.ts`（**不要再写 `toLocaleDateString`/`toLocaleString` 显示时间**）。固定 `Asia/Shanghai` + 显式 options + 手工去逗号 → 输出恒定 `2026-08-18 18:18`，服务端与客户端一致（避免水合不匹配），且对各地访客显示同一时刻。`formatDateTime`（有真实时间才到分钟，`date: '2026-08-27'` 这类只到日）、`formatDate`（强制到日）、`formatDateTimeStrict`（时间戳类强制到分钟）、`formatMonthDay`、`shouldShowUpdatedAt`（同一分钟或**更新早于发布**时不展示更新时间）、`hasTimePart`。判据：源串含 `T` 且时分秒非全零才算"有真实时间"——因为 `new Date('2026-08-27')` 会被解析成 UTC 午夜，照样格式化就会显示没有意义的 `08:00`。
- **updatedAt 的 mtime 兜底**：`lib/mdx.ts` / `lib/docs.ts` 里 `data.updatedAt ?? 文件 mtime` 只在 mtime **比发布时间晚 1 小时以上**时采纳。否则每次 scp/复制文件（mtime 被刷新）都会让文章凭空多出"更新时间"，甚至出现"更新早于发布"。**注意：手工编辑 frontmatter 也会刷新 mtime**，所以改动内容时最好显式写上 `updatedAt`（或在后台编辑，action 会写好）。
- **阅读量统计的作用域**：`post_stats` 有 `type` 列（`post` = 博客文章、`doc` = 文库档案），唯一键是 **`@@unique([type, slug])`**——不是 slug 单列，否则文章与档案同名会共用同一份计数。`lib/post-stats.ts` 的 `trackPostView/getPostStats/getPostStatsMap` 均带 `type` 参数（默认 `"post"`，文章侧调用点无需改）。详情页接口：文章 `/api/posts/[slug]/view`、档案 `/api/docs/[slug]/view`；两者各自持有 10s/IP 限流器且限流键分别带 `post:` / `doc:` 前缀（避免同一 IP 刚看完文章再看档案被误吞）。客户端 `PostViewTracker` 的 sessionStorage 去重键是 **`viewed:${type}:${slug}`**（早期只按 slug，同名会互相抑制计数）。档案只有阅读量，用 `ViewCountBadge`（不显示 ❤/🔖）。
- **书签续读提示**：`components/blog/reading-resume.tsx` 是**必须传 props** 的组件：`<ReadingResume slug={…} type="post|doc" />`（两个详情页都要传，漏传会编译报错）。两条路径：**(1) 显式深链** `#bm-<0~1百分比>`（从「书签&收藏」弹层点进来）→ 直接跳转（0 / 0.8s / 2s 三次校正）+ 提示「已回到书签位置」，不弹询问；**(2) 直接打开页面** → 客户端查 `/api/bookmarks?type=&slug=`，若已登录且该篇有书签，**每次进入都弹**「上次读到 X%」+「跳转到书签位置」/「取消」。提示行为：**只弹一个**（模块级 `promptedKey` 守卫，key = `pathname#type:slug`）、**10 秒自动消失**（`PROMPT_DURATION_MS`，带倒计时进度条 `.bookmark-prompt-toast`，见 globals.css）、**切换页面立即 `toast.dismiss(toastId)`**（提示不跨页残留）。**守卫必须在 effect 的 cleanup 里释放**（`if (promptedKey === key) promptedKey = null`）——否则客户端路由（点列表卡片回文章）不重载模块，第二次进入同一篇就再也不弹了（这是真实踩过的 bug）。仅两种情况不弹：URL 带 `#bm-`（走路径 1）、当前位置与书签位置相差 <6%（`isPositionResumable`，且该判据在**请求解析后**执行，能识别用户已用书签按钮跳过去的情况）。**书签状态只能在客户端查**：文章/文库详情是 ISR 缓存的公开页，服务端读 session 会把它们变成动态渲染。
- **书签按钮**：`components/blog/bookmark-button.tsx` —— **没有书签 → 点击直接在当前位置创建**（保持原逻辑）；**已有书签 → 点击弹出 Radix `DropdownMenu`**（`side="top" align="end"`，贴着浮标向上展开）：「更新书签」（记录到当前位置）/「跳转到书签所在位置」/「取消」。共享逻辑抽到 `lib/bookmark-scroll.ts`（`captureBookmarkPosition` / `saveBookmark` / `scrollToBookmarkPercent` / `isPositionResumable` / `computeScrollPercent`），两处复用避免行为漂移。
- **sonner 的两个坑**：① `Action.onClick` 是**必填**的，想做"纯取消"按钮要显式给空实现；② 用 `.click()` 在无头浏览器里**点不开 Radix 的 DropdownMenu**（它监听 `pointerdown`），E2E 必须用 CDP `Input.dispatchMouseEvent` 派发真实鼠标事件，否则会得到"菜单不存在"的假阴性。

## 当前状态（2026-10-07）

- 最新改动（**仅本地，未提交未部署**）：书签续读提示的生命周期修复 + 书签按钮选项框。
  1. **提示生命周期**（按用户反馈重做）：**只弹一个**（模块级 `promptedKey` 守卫，key = `pathname#type:slug`，跨实例也拦得住）、**10 秒自动消失**（`PROMPT_DURATION_MS` + `.bookmark-prompt-toast` 倒计时进度条，见 globals.css）、**切换页面立即 `toast.dismiss(toastId)`**（之前会残留/叠加到别的界面）。深链 `#bm-*` 仍直接跳转、不弹询问。
  2. **书签按钮**：抽了 `lib/bookmark-scroll.ts`（`captureBookmarkPosition` / `saveBookmark` / `scrollToBookmarkPercent` / `isPositionResumable` / `computeScrollPercent`）供两处复用；**没有书签 → 点击直接创建**（原逻辑）；**已有书签 → 点击弹出 Radix `DropdownMenu`**（`side="top" align="end"`，贴浮标向上展开）：「更新书签」/「跳转到书签所在位置」/「取消」。
  3. 修掉两个连带 bug：① 从选项框跳转后，续读提示还会再弹一次——把位置判据放在**请求解析后**（提示真正显示前），能识别用户已经跳过去了；② **客户端路由回到同一篇时不提示**——模块级守卫 `promptedKey` 没在 effect cleanup 里释放，而客户端路由不重载模块，所以第二次进入同一篇就再也不弹（这是用户报的"不是每次点进文章都有书签提示"的真因）。
  - 验收：typecheck ✓ / build ✓；真机 E2E（临时用户 `__e2e_bm_user__` + 一条 60% 书签，已清理）——**同时只有 1 个 toast**、**10235ms 自动消失**、**换页后 toasts 清空**、**从选项框跳转后 ask count = 0**、`0.294 → 0.600` 跳转精确、无书签时点击直接保存、选项框三项文案与「取消」不改变滚动位置、**整页加载 / 客户端路由首次进入 / 客户端路由再次进入 的 ask count 均为 1** 全部通过。
  - 重要更正 1：**我一度以为"弹两个"是因为 `ReadingResume` 被挂载两次，这个判断是错的**（`app/blog/` 下只有 `layout.tsx`，没有 `[slug]/layout.tsx`）。实测无头环境只有 1 个 toast。用户环境与探针不一致的原因未完全确定（可能是 sonner 在不同版本/配置下的行为差异），所以改用**不依赖 sonner 默认行为**的确定性方案：显式记录 `toastId` + 模块级守卫 + 显式定时/卸载 dismiss。
  - 重要更正 2（E2E 方法论）：验证"客户端路由"必须**制造真正的客户端跳转**。我先后踩了两次假复现——① 用 `Page.navigate`（整页加载会重置模块状态，掩盖了守卫 bug）；② 用 `querySelectorAll('a[href=...]')` 取链接时**命中了隐藏的那棵主题树**（`/blog` 与首页把 `ui-classic-only` / `ui-explore-only` **两棵树同时渲染进 DOM**），宿主元素宽高为 0、点击无效、页面根本没跳。→ 判可见性要用 `offsetParent !== null`，**不能用 `getBoundingClientRect().width > 0`**；或用 `a.click()` 触发一次真实的 Next Link 导航。
  - 坑（sonner）：`Action.onClick` **必填**，做"纯取消"按钮要给空实现。
  - 坑（E2E）：`.click()` **点不开 Radix 的 DropdownMenu**（监听 `pointerdown`），必须用 CDP `Input.dispatchMouseEvent` 派发真实鼠标事件；否则会得到"菜单不存在"的假阴性（我这次就踩了，一度以为功能坏了）。
  - 坑：**别用模块级状态做"刚发生过某事"的抑制**（我加的 `msSinceBookmarkJump` 会跨文章泄漏：A 文跳转后 8 秒内切到 B 文，B 的提示被误吞）——已撤掉，改用纯函数位置判据。
  - 坑（选题教训）：第一次用 `hello-world` 当测试文章，`article` 高度只有 296px、`max=0`，跳转断言假失败——**挑测试文章要看内容长度**（≥14KB 的 `typescript-tutorial` 才有 13721px 可滚动高度）。
  - 坑：PowerShell 的 `Get-Content -Raw` + `Set-Content` 改含中文的 UTF-8 脚本会把中文读成 ANSI 再写回，**整个文件乱码**。改本地脚本用编辑工具，别用 PS 文本 cmdlet 做替换。
- 运维（**服务器侧，无代码变更**）：
  1. **用户报告"点按钮很久才响应"的排查结论**：应用本身不慢——localhost 直连 `/` 101ms、`/blog` 94ms、`/docs` **44ms**，静态资源 1–3ms；经 nginx 走公网却是 1.0–1.5s。根因两条：**(a) nginx 只压缩 HTML，JS/CSS 完全不压缩**（全站 2.6MB JS + 491KB CSS 走明文，每次访问多传约 2.2MB）；**(b) 页面本身胖 + 链路 RTT 高**（首页 HTML 662KB，其中**内联 script 359KB 占 68.9%**（RSC flight 数据）、class 属性 84KB；且首页同时渲染了两套主题树 `ui-classic-only` + `ui-explore-only`）。换页 TTFB 实测 0.31–1.12s（服务器累计 TCP 重传 99 万次）。→ 体积的根因（双主题同帧渲染 + 内联 RSC 数据）属架构级改动，**尚未处理**。
  2. **已做：给 nginx 开 gzip_types**（见上「服务器 Runbook」）。实测 JS -71.7%、CSS -83.4%、`/docs` 264KB→81KB、`/` 678KB→173KB。改前备份 `/root/nginx.conf.bak-20261007-172910`，`nginx -t` 通过后才 reload。
  3. **已做：关停 bizbot 全家桶**（用户要求）。`bizbot-agent.service`（root 常驻）与 `bizbot-updater.service`（**具备按验签清单替换宿主机任意文件的能力**）已 `stop` + `disable`；4 个容器（bizbot / bizbot-nginx / bizbot-mysql / bizbot-embedding）已 `stop`（**Exited，数据与镜像均保留**）；`/mnt/bizbot/docker-compose` 已移到备份目录防止误启动。备份与恢复步骤在 `/root/bizbot-shutdown-20261007-172742/`（含 `RESTORE.md`、compose 文件、两个 unit 文件、containers-inspect.json）。**注意 `bizbot-embedding` 在独立 compose 文件里，`docker compose stop` 不会停它，需单独 `docker stop`。** 关停后 swap 占用 1.54GB → 0.87GB。
  4. **发现但未动（等用户决定）**：宿主机还跑着**宝塔面板的 MySQL**（`/www/server/mysql`，`mysqld.service`，**开机自启**，占 ~160MB 内存 + ~152MB swap，监听 `*:3306` 但 ufw 未放行 → 外网被拦）；宝塔面板本体（`bt.service`）与 `php-fpm-82` 都是 inactive dead，属遗留。另有 netdata(~160MB)、YDService/barad_agent（腾讯云镜等代理）、pure-ftpd(21)、dockerd/containerd（容器已空，仍占 ~94MB CPU 时间最多）。
- 最新改动（**已推送 GitHub `8f4322f` 并部署服务器 2026-10-07，服务端验证通过**）：文库档案阅读量（复用文章的统计体系）——
  1. **schema 变更**：`PostStats` 加 `type String @default("post")`，唯一键 `slug @unique` → **`@@unique([type, slug])`**；迁移 `20261007070046_add_stats_type`（Prisma 生成的 RedefineTables + `INSERT...SELECT` 回填，**不动历史计数**）。本地实测：10 行历史数据全保留、浏览总量 43 不变、`type` 全为 `post`；复合唯一键探针验证同名 post/doc 可共存、重复 doc 被拒。
  2. `lib/post-stats.ts`：`trackPostView/getPostStats/getPostStatsMap` 增加 `type: StatsType = "post"` 参数（文章侧调用点零改动）；`likePost/toggleFavorite` 里的 6 处 `where: { slug }` 改为 `where: { type_slug: { type: "post", slug } }`（删掉 `slug @unique` 后必须改，否则 TS 报 `PostStatsWhereUniqueInput` 不可赋值）。
  3. 新增 `app/api/docs/[slug]/view/route.ts`（GET/POST），限流键带 `doc:` 前缀；文章侧同步加 `post:` 前缀——**两者限流预算分开**，避免同一 IP 刚看完文章再看档案被误吞。
  4. 客户端：`PostViewTracker`/`PostStatBadges` 加 `type`；**抽出新组件 `ViewCountBadge`**（只显示 👁 总/月，档案没有点赞收藏）；sessionStorage 去重键从 `post-viewed:${slug}` 改为 **`viewed:${type}:${slug}`**（原文案存在同名 slug 互相抑制计数的隐患）。
  5. 接入：`/docs/[slug]` 头部徽标 + tracker、`/docs` 列表卡片阅读量、`/admin/docs` 列表阅读量。
  - 验收：typecheck ✓ / build ✓（`/api/docs/[slug]/view` 已注册）；Chrome CDP 真机 E2E（夹具档案 `__e2e_阅读量测试__`，**中文 slug**）——首访 `0→1`、**同会话连刷 2 次仍为 1**（sessionStorage 去重生效）、清 sessionStorage 后过 10s 窗口再访 `1→2`、徽标无 ❤/🔖、`/docs` 列表数字正确；`/docs` 与中文 slug 详情页均 200。夹具与统计行已清理。
  - **线上部署（2026-10-07，提交 `ed8cc78` 功能 + `cc24171` 图标）**：11 文件 tar+scp（**零 content 文件**，遵守单向内容规则；服务器上已有的 `计算机网络期末总复习.mdx` 未被触碰）→ 覆盖前用 blob 遍历确认 8 个待覆盖文件全部来自 main 历史 ✓；**先手动备份** `data/blog.db` 到 `/root/backup-manual-20261007-162246-docstats.db`，再 `prisma migrate deploy` + `generate`；服务器 `next build` ✓、`pm2 restart` ✓（重启后无新错误日志）。
    - **迁移前后对比（线上真实数据，零损失）**：行数 12→12、浏览总量 **189→189**、点赞 **21→21**、收藏 **10→10**、`type` 列已加且历史行全为 `post`。
    - **服务端确定性验证**：`GET /api/docs/java面试八股/view` → `0`（只读不计数）；`POST` → **`1`**；10s 窗口内再 `POST` → **HTTP 202 且计数保持 1**（限流生效）；库内出现 `type=doc` 行；文章侧 `/api/posts/hello-world/view` 正常 +1、post 行总数与浏览总量不变。
    - 坑：部署时 `pnpm exec next build` 的输出没被我的后台任务捕获（进程正常结束、`BUILD_ID` 已更新），**判断构建成败要看 `.next/BUILD_ID` 时间戳而不是只看捕获到的输出**。
  - **教训（无头浏览器诊断不可信）**：本次为验证客户端 tracker，我连续写了 8 个 CDP 诊断脚本，得到"脚本 0 响应 / bodyText=0 / 未水合"等**全是假象**的结论——真相是无头环境里页面长时间停在 `readyState=loading`，**探针读得太早**；对照实验（已知正常的文章详情页）同样"没有发出任何 /api 请求"，才证明是**探针问题而非站点问题**。→ 以后验证客户端行为：**先用一个已知正常的页面做对照**，并且**以服务端数据（DB/接口）为最终判据**，不要采信无头环境的时序观测。
  - **待用户确认的遗留项**：服务器错误日志里有 `ReferenceError: 网络号 is not defined`（digest 1839713524）——来源是 `content/docs/计算机网络期末总复习.mdx:261` 的裸花括号表达式 `` `IP 地址 = {网络号, 主机号}` ``（MDX 会把它当 JS 求值）。该文件属服务器侧内容，**按单向规则我没有改动它**，已提醒用户转义。

## 当前状态（2026-10-06）

- 最新改动（**已推送 GitHub `0a3eb16` 并部署服务器 2026-10-06，线上验证通过**）：日期时间展示精确到分钟 + 整站统一——
  1. 新增 `lib/format-date.ts`：固定 `Asia/Shanghai`、显式 options、输出恒定 `2026-08-18 18:18`（en-CA 的逗号手工去掉）。**替换掉全站 20+ 处 `toLocaleDateString`/`toLocaleString` 时间显示**（`PostDates`、`app/page.tsx` FEATURED、`app/blog/[slug]` 元信息条+sr-only、首页时间线与 stats/data widget、`/updates`、`/docs`、留言卡、资源卡、文库与资源管理页、`/admin/{posts,docs,updates,users,danmaku,resources}`、`/messages`、资源评论、快报、收藏弹层）。
  2. `shouldShowUpdatedAt`：**同一分钟**或**更新早于发布**（文件 mtime 回退造成的脏数据）时不显示"更新"；`hasTimePart`：`date: '2026-08-27'` 这类只有日期的内容只显示到日，不再显示无意义的 `08:00`。
  3. 根因修复：`lib/mdx.ts` / `lib/docs.ts` 的 `data.updatedAt ?? 文件 mtime` 改为**只在 mtime 比发布时间晚 1 小时以上才采纳**——否则每次部署 scp 刷新 mtime 都会让文章凭空多出更新时间（`spring-学习笔记02` 曾出现"更新早于发布 647ms"）。
  4. 内容补全（用户选定）：`formula-test.mdx`（`2026-08-29T08:52:58.000Z`）、`java面试八股.mdx`（`2026-09-23T20:39:42+08:00`）补上时间；`typescript-tutorial.mdx` 的 `date` 是原文（CSDN）发布日期 2025-04-27，时间取 **12:00（占位，需用户确认）**。这三个文件同时补写显式 `updatedAt`（取编辑前的真实 mtime），抵消"改 frontmatter 刷新 mtime"带来的假更新时间。
  - 验收：typecheck ✓ / build ✓（52/52）；真实页面（Chrome CDP）抓取验证——`/blog` 10 篇卡片、详情页元信息条（`2026-08-18 18:18 更新于 2026-08-24 20:20`）、首页、`/updates` 全部输出 `YYYY-MM-DD HH:mm`；`spring-学习笔记02`/`tarjan` 的假"更新"已消失；毫秒级差异被抑制。
  - 坑：`DateTimeFormat("en-CA")` 的官方输出是 `2026-08-18, 18:18`（**带逗号**），需 `.replace(",", "")`；`toLocaleDateString` 依赖运行环境 locale，做 UI 输出会有 SSR/CSR 不一致（水合报错）风险，故全部改用显式 options。
  - **线上部署（2026-10-06）**：代码 25 文件走 tar+scp（`deploy-datefmt.tar.gz`），3 个内容文件**单独 scp**（规避 Windows tar 处理中文文件名的隐患）→ 解压后 sha256 逐一比对与本地一致、`lib/format-date.ts` 确认落地(4723B)、20 个文件引用它；服务器 `next build` ✓、`pm2 restart` ✓（重启后无新错误日志）；本地 9 条 + 公网 5 条路由全 200；`/blog` HTML 抽查时间串全为 `YYYY-MM-DD HH:mm` 且**无逗号残留**；构建产物命中 `Asia/Shanghai` 36 处。
  - **内容对齐决策（本次）**：服务器独有的「大肥鱼之躯…DeepSeekHarness」（10-06 03:32）与「各位中秋国庆快乐」动态**未受影响**（未部署 content 目录整体，仅 scp 3 个指定文件）；`formula-test.mdx` **故意不部署**（服务器上本无此文件，它是我调试用的测试文章，不该推上线）；`java面试八股.mdx` 的 `updatedAt` 按服务器真实值改为 `2026-09-28T20:57:20+08:00`（本地原写 09-25 会把线上更新时间倒退 3 天）。→ **教训：内容文件改动部署前必须先与服务器逐个比对 frontmatter**。
  - 内容现状：服务器 `content/posts` 11 篇（含本地没有的「大肥鱼」）、`updates` 16 份（含本地没有的「中秋国庆快乐」）；本地仍有 `formula-test.mdx`（未上线）与「大肥鱼」缺失——**两个方向都还没完全对齐，待用户决定是否从服务器拉回**。
- 此前（**已推送 GitHub `c599370` 并部署服务器 2026-10-06，线上验证通过**）：博客/文库简介支持内联 Markdown——
  1. 新增 `lib/mdx-inline.ts` + `components/ui/mdx-inline.tsx`：单遍扫描解析（优先级 行内代码 > 链接/图片 > 粗体 > 斜体 > 删除线），渲染成 React 元素而非 HTML 字符串 → 坏语法按字面显示、无 XSS 面；**未用 `react-markdown`**（它会给资源页塞 110KB/305KB 客户端 chunk），本组件是纯函数、服务端与客户端通吃。
  2. 接入 7 处：`app/page.tsx`（FEATURED + 经典列表）、`app/blog/page.tsx`（探索 + 经典）、`app/blog/[slug]/page.tsx`、`app/docs/page.tsx`、`app/docs/[slug]/page.tsx`；两个详情页的 `generateMetadata` 与 `app/feed.xml/route.ts` 改用 `stripMarkdown()` 降级纯文本。
  3. `components/admin/mdx-editor.tsx` 的「描述」输入框加语法提示 + 实时预览（命中标记时标注「已识别 Markdown 标记」）。简介 zod 上限保持 500 字不变。
  4. `.gitignore` 的 `.vscode/*.local` 改为 `.vscode/`（VS Code 的 Comment Translate 扩展会自动写 `.vscode/settings.json`，属编辑器本地配置不该入库）。
  - 验收：`lib/mdx-inline.ts` **24 项断言全过**（含未闭合标记按字面、`javascript:`/`data:` 协议拦截、原始 HTML 剥除、真实语料回归）；Chrome 截图确认粗体/代码/删除线/链接/换行/坏语法/XSS 样例渲染正确；typecheck ✓ / build ✓（52/52，删 `.next` 全量重建亦过）。
  - **线上部署**：11 文件 tar+scp（本次首次把 `.gitignore` 纳入部署清单）→ 解压后逐个 sha256 与本地一致、**新文件 `lib/mdx-inline.ts` / `components/ui/mdx-inline.tsx` 确认落地非空**、`grep` 确认 `stripMarkdown` 已接入 `feed.xml`；服务器 build ✓、`pm2 restart` ✓（重启后无新错误日志）；本地 10 条 + 公网 4 条路由全 200；构建产物命中 `stripMarkdown` 12 处、`已识别 Markdown 标记` 3 处；`/feed.xml` 抽查 5 条 `<description>` 均为纯文本、无标记残渣。
  - **部署前核对发现的坑**：服务器 `.gitignore` 与 `app/feed.xml/route.ts` 的 blob **不在 main 历史中**，一度看起来像"前向未知版本"。查明真相：`feed.xml` 等于本地 `dc92f41` 版本（它本来就不在上次部署的 12 文件清单里，本次的 `stripMarkdown` 是新增改动），`.gitignore` 是首次提交之前的遗留版本（服务器不需要它）。→ **核对时不能只比对"当前提交或上一次提交"，还要检查该文件是否本来就不在部署清单内**；`AGENTS.md` 则因每次部署都会被单独改写而天然对不上提交。
  - 坑：删掉临时预览路由后 `.next/types/validator.ts` 仍引用旧路径 → typecheck 报 `TS2307 Cannot find module '../../app/preview-desc/page.js'`，删 `.next` 重建即可（与 Turbopack 缓存损坏同类）。
  - 坑：commit message 里含**反引号**（`` ` ``）时，PowerShell here-string 会做转义解析并把消息拆坏（git 会把片段当 pathspec 报 `did not match any file(s)`）→ 用单引号 here-string `@'…'@` 并 `$msg | git commit -F -`。
  - **内容不同步（待用户处理）**：服务器 `content/posts` 有 11 篇，本地 10 篇——服务器多出「大肥鱼之躯：从结构与流程解读 DeepSeekHarness」（2026-10-06 03:05 在服务器侧创建）；另有 `content/updates/20261003100253-各位中秋国庆快乐.mdx` 也只在服务器。而本地那篇 `spring-学习笔记03…mdx` 的 `updatedAt` 改动（用户 2026-10-06 凌晨在本地后台编辑）**未提交、也未部署**，服务器上该文仍是 10-02 的旧版本。→ 内容以服务器为准，若要统一需从服务器拉回（注意 Windows bsdtar 解不了 Linux UTF-8 中文名 tar，须用 Python tarfile）。

## 当前状态（2026-10-05）

- 最新改动（**已推送 GitHub `dc92f41` 并部署服务器 2026-10-05，线上验证通过**）：提交入口限流 + 鉴权加固（`updateUserRole` 等自证身份）——
  0. **鉴权加固**：`updateUserRole` 原先函数内**无任何校验**，只靠 `/admin` 的 proxy 与 `/admin/users` 的 `notFound()` 保护"页面渲染"这条路——而 Server Action 编译后是可直接 POST 的入口，一旦 actionId 经 source map/日志/后续重构外泄就是一条请求提权。现改为函数内 `auth()` + `role === "OWNER"` + 角色枚举校验 + **禁止改自己** + 禁止改 OWNER 账号；`updateNickname`/`changePassword` 同批改为**只操作 `session.user.id`**，签名去掉客户端传入的 `userId`（组件 `bind` 已同步移除）。`user-role-form.tsx` 改为展示失败原因 + 成功后 `location.reload()`。
  1. `lib/rate-limit.ts` 新增 `createWaitLimiter`（免费额度 + 最小间隔 + 静默窗口自动清零，返回 `retryAfterMs`）、`createRateLimiter.retryAfterMs/clear`、`clientIpFromHeaders`、`describeRetryAfter`。
  2. 弹幕（`app/danmaku/actions.ts` + `components/danmaku/danmaku-form.tsx`）：**保持人人可发、不做角色校验**，仅防刷屏——前 3 条不限速，第 4 条起每条 ≥3 秒，5 分钟静默后从免费额度重新起算；输入框下方行内倒计时「发送过快，请 N 秒后再试」，冷却期间输入与按钮禁用，归零自动恢复（无需刷新）。
  3. 留言墙 `2 条免费 / 15s`、资源评论 `3 条免费 / 10s`（按钮显示 `Ns` 倒计时 + 行内提示）、注册 `3 次/10min`、登录 `6 次/1min`（成功即清零，防撞库/批量注册）。
  4. 坑：冷却结束必须让提示一起消失——初版在 `cooling=false` 时回落到 `state.error`，会留下已过期的「请 N 秒后再试」（E2E 抓出来的）；限流器是**进程内存态**，改代码触发热更新或重启进程即清零（E2E 连跑两次会互相污染，需换 UA 或重启）。
  - 验收：typecheck ✓ / build ✓；Chrome CDP 真机 E2E——弹幕 1-3 放行、第 4 条限速且倒计时归零后自动恢复（连发 5 条全程通过）、留言墙第 3 条起限速 15s、登录第 7 次被限（前 6 次为密码错误）、资源评论第 4 条限速 10s 且 10.5s 后按钮恢复；393px 抽屉内提示不破版（wrap 197px / input 157px、无横向溢出）；鉴权侧——访客访问 `/admin/users` 被 proxy 挡回 `/`，站长在 `/admin/users` 点「升为管理员」成功（`currentRole` 由 VISITOR→ADMIN，落库复核同值），服务端拒绝分支因非站长无任何可达调用面而无法从 E2E 触达（**这本身即是"action 仅在 OWNER 页面注册"的额外防线**）。测试数据与夹具已从本地库清除。
  - **线上部署（2026-10-05）**：12 文件 tar+scp（`deploy.tar.gz`，本地/服务器 sha256 三处抽查一致）→ 覆盖前用 `git hash-object` 逐个比对——6 个等于服务器 HEAD `0df8370`，另 6 个经 blob 遍历证明来自 main 历史上的提交（`871a7a3`/`52459ba`/`47df2fc`），确认为历史版本而非前向未知版本后才解压；无依赖/schema 变更，服务器 `next build` ✓、`pm2 restart infblog` ✓；localhost 8 条路由 + 公网 3 条均 200，`grep .next/static/chunks` 确认「发送过快/评论过于频繁/只有站长可以调整用户权限」已进构建产物。
  - **线上实测**：公网 Chrome CDP 连发弹幕，两轮各**恰好落库 3 条**、第 4 条被服务端拒绝（`danmaku` 表 count 复核：23/24/25 为第一轮，26/27/28 为第二轮），证明新构建的 Server Action 可用且限流在线上生效；线上测试弹幕 6 条已从生产库删除（现 15 条）。**坑**：探测限流不能靠"输入框被清空"判断（React 提交后无论成败都会重置非受控 input），且公网响应回程比本机慢，探针须轮询到「冷却中」再断言，否则会把"限流成功"误读成"未限流"；排查该问题时 `curl` 在 PowerShell 里被 `Invoke-WebRequest` 别名劫持，服务器侧脚本一律写成 `.sh` 文件 scp 过去执行。
- 此前（**已推送 GitHub 并部署服务器 2026-10-03 验证 200**）：用户文案调整（`c4e0809`）——关于页「关于我」重写（平台定位 + AIGC 占比声明）、竖排诗行「向月之暗面致意→向遥不可及致意」、外观设置主题/背景描述微调；typecheck 过，3 文件 tar+scp 部署，build ✓，localhost 与 /about 均 200。
- 此前：同日全量部署（`cb17b1b` → `c02d6fe` 响应式+探索主题全链，160 文件 tar+scp）。
  - 部署方式：服务器 git HEAD=`0df8370`（为本地祖先）→ `core.quotepath=false` diff 出 160 个代码文件 tar+scp（**排除 content/data/public/uploads 三项服务器资产**；git 中文路径引号坑已踩）；删除文件 `app/favicon.ico`、`components/weather/weather-bar.tsx` 服务器侧手删。
  - 服务器侧：`pnpm install --frozen-lockfile`（新依赖）、`prisma migrate deploy`（无待迁移）、build ✓、`pm2 restart infblog` ✓；localhost:3000/公网/探索主题参数/博客页均 200，页面已含 `v2-starfield-canvas`。
  - 坑：服务器工作区常有大量未提交修改（历次 tar 部署残留），部署前用 sha256 抽查关键文件确认其为历史提交版本而非前向未知版本，再覆盖。
- 此前：`47df2fc` 星野提亮、`dba0bad` 程序化星野、`986849a` 镜花水月转场、`45f5f95` hero 融解、`674b14f` 移动端修复、`cb17b1b` 响应式四层加固（均已随本次部署上线）。
  1. **硬伤修复**：RECENT_PROJECTS 项目名 `shrink-0`（不再被描述列挤没）；封面图统一 `components/ui/cover-image.tsx`（onError 整容器隐藏，不再撑出死白盒）；从服务器 scp 补齐缺失封面 `muqn60sd-*.webp`；EARTH_RADIO 标签移到播放器下方；MISSION_LOG 的 Scroll 提示内联到标题旁；FEATURED 标题改 `clamp(2rem,2.4vw+1rem,2.6rem)`。
  2. **顶栏天气实测避让**（替代比例阈值猜测）：天气条内嵌进 navbar 绝对居中，ResizeObserver 实测左右**内容**边沿（注意左右组是 flex-1 弹性盒，必须量子元素而非组盒），空间不足淡出（窄屏走抽屉）；`weather-bar.tsx` 已删，`useAspectRatio` 仅用于右侧折叠（wideLayout）与抽屉天气。
  3. **右下角悬浮件锚点契约** `components/layout/corner.ts`（CORNER.backToTop/float/write 三档 + CORNER_RIGHT），回到顶部/文章操作/文库书签/书写入口（从右上挪回右下角第三档，原设计意图）统一取用，新增悬浮件禁止散落坐标。
  4. **短高度紧凑档**：globals.css 末尾 `@media (max-height:780px) and (min-width:1024px)` 压缩 `.v2-band` 纵向节奏（信息带 py 2.25rem、标题降档、marquee 6rem）。
  - 验收：typecheck/build 过；真机矩阵截图 1280×800（天气收起无碰撞）/ 1920×1080（天气居中）/ 1366×768（紧凑档）/ 393 手机（封面正常）均通过。
- 最新线上部署 2026-09-29：名片卡入口 `/card`（`b862b3e` + 修复 `d356f24`，**反代后重定向必须相对 Location**）。——PCB 名片二维码直达路由：`counters` 表 `card-visits` 计数（通用 key/value 计数器，失败不阻塞）→ 307 跳主页 + 120s `from_card` cookie → 根布局 `CardWelcome` 弹窗「欢迎通过名片卡访问本站！」（弹出即清 cookie，刷新不再弹）。线上实测计数自增 ✓。
  - 坑：**反代后的重定向必须用相对 Location**（`Location: /`）——next start 跑在 nginx 后，`request.url` 是内部地址（http://localhost:3000），`new URL("/", request.url)` 会把线上用户重定向到 localhost。
- 上一轮改动（**已部署服务器 2026-09-27**）：定制 404 + 阅读书签系统（commits `75a2ab9`/`532e25b`）——
  1. **404**：`app/not-found.tsx`（站点风格 + 去向引导）；nginx 三个 alias（`/uploads/ /music/ /environment/`）加 `error_page 404 @app_404`（rewrite 到 Next `/404`，命名 location 里 `proxy_pass` 不能带 URI）。
  2. **书签**：`Bookmark` 模型（userId+type+slug 唯一）+ `/api/bookmarks`（GET/POST/DELETE）；浮栏按钮（博客/文库）记录 percent+最近章节锚点；底部 toast（独立 bottom Toaster，含「查看书签」动作经 `infblog:open-library` 事件开弹层）；用户菜单「书签&收藏」弹层双区；`ReadingResume` 按 `#bm-` 恢复（原生 hashchange 监听 + 懒加载漂移两次校正 + 2s 去重守卫防 StrictMode 双跑）。
  3. **坑**：`params.slug` 是 URL 编码态，中文 slug 直接用于 schema/统计会超限/错位——博客详情页统一改用解码后 `post.slug`；书签链接须原生 `<a>`（Next Link pushState 不触发 hashchange）。
  4. 服务器部署 schema 变更：`pnpm exec prisma migrate deploy && pnpm exec prisma generate`（migrate deploy 不生成 client）。
- 上一轮改动（**已部署服务器 2026-09-23**）：**文库模块上线**（commits `5858c29`/`a83aabe`）——
  1. **文库**：`content/docs/*.mdx`（数据层 `lib/docs.ts`，比 Post 多 `source`/`sourceUrl` 出处字段）；`/docs` 卡片列表（统计条 + Reveal 动效 + hover 上浮）；`/docs/[slug]` 详情（复用文章全套管线：KaTeX+Shiki+居中布局+右侧目录+来源链接）；导航「资源分享」和「留言墙」之间；搜索命令同步；管理后台「文库管理」。
  2. **站长 CRUD**：`/admin/docs`（列表/新建/编辑/删除，仅 OWNER，复用 MdxEditor + DocForm + removeDoc action）。
  3. **图片本地化**：`scripts/cache-external-images.ts`（外链图片 → sharp WebP q80 宽≤1600 → `public/uploads/docs/<url sha1 10位>.webp` → 原地改写 MDX；幂等/去重/动图支持；nginx `/uploads/` alias 直服）；首份档案「Java面试八股」48 图 4.63MB→1.67MB（省 81%）；`mdx-components` 正文图加 `loading="lazy"`。
  4. **首份档案**：Java面试八股（语雀密码文档爬取，Lake HTML→MDX 自写转换器；4.9 万字/203 标题/13 代码块/2 表格）。
  - 坑：语雀 Lake 内容在内容 API 的 `data.content`（`body_asl` 为空）；`<card name="codeblock|image|board">` 的 value 是 URL 编码 JSON；转换器需把文本节点 `{}`→HTML 实体、`<`→`&lt;`（防 MDX 解析炸），`<code>` 内嵌 span 需 `get_text()`。
- 上一轮改动（**已部署服务器 2026-09-23**）：首页 `// RECENT_PROJECTS` 改为展示 profile 三个 pin 项目（commit `ecd6856`）——`siteConfig.githubRepos` 改 **`owner/repo` 全名格式**（`nisconder/npm-safe`、`InfiniteScope/InfBlog`、`Soren-ABT/dsh-knowledge`，按序展示、单个失败即隐藏）；API 由"拉用户仓库再过滤"改为**逐个 `GET /repos/{owner}/{repo}`**（支持跨 owner），成功后写回 `data/github-repos-cache.json` 降级缓存。改 pin 项目只动 `lib/config.ts` 一行。
- 上一轮改动（**已部署服务器 2026-09-20**）：阅读与列表体验批改（commit `858de27`）——
  1. **文章页布局**：3 列网格（中列 48rem）文章**始终居中**（侧栏收起/展开都不变）；目录用**容器查询**（`@container` + `@min-[1150px]`）贴内容区右缘，可用宽度不足时自动隐藏；TOC 宽度 w-44。
  2. **粒子/光晕图层**下调为 `-z-10`（`particle-background.tsx`/`blob-background.tsx`），不再遮挡图片与文字。
  3. **博客 tag 筛选**：`components/blog/blog-tag-filter.tsx`（胶囊：全部+各标签计数，URL `?tag=`，切排序保留筛选）；`lib/post-sort.ts` 默认排序改 `publishedAt`（正序=新→旧）；探索卡片标签改胶囊样式。
  4. **卡片双日期**：`components/blog/post-dates.tsx`（📅发布在前、🔄更新在后；按「日期字符串」去重，避免 mtime 回退导致同日双显）。
  5. **搜索门控**：搜索弹层「管理后台」仅 OWNER/ADMIN 可见（`search-command.tsx` 用 useSession）。
  6. 首页 tag 链接（`/blog?tag=`）自此真实生效闭环。
  - 坑：Turbopack 缓存损坏（`Failed to mmap SST file`）时删 `.next/cache/turbopack` 重建即可。
- 上一轮改动（**已部署 2026-09-20**）：首页「最新文章」展示顺序改为**按发布时间从新到旧**（commit `6011573`）——`app/page.tsx` 新增 `displayPosts`（`[...posts].sort(date desc)`），仅首页展示数组（featured/latestPosts/classicPosts）使用，widgets/标签统计仍用原序；`/blog` 列表默认仍是更新时间排序（有排序控件可切）。
- 上一轮改动（**已部署服务器 2026-09-20，pm2 online，公网验证通过**）：阅读体验三项（commits `c723043`/`b6ed94f`/`17b4f9d`/`cefd24f`）——
  1. **代码高亮**：rehype-pretty-code（Shiki，双主题 github-light/dark 跟随站点明暗）；`components/blog/code-block.tsx`（语言徽标 + 一键复制，复制读 DOM 不重复携带源码）；样式在 globals.css（行号 `showLineNumbers`/行高亮 `{3-5}`/标题 `title=` 备好）；**`rehypeStyleObject` 必须排在 rehypePlugins 最后**（转换 Shiki 内联 style 为 JSX 对象）；围栏不写语言 = plaintext 无配色（如 Tarjan 篇）。
  2. **文章目录**：`lib/headings.ts`（与 mdx-components 共享 slugify，保证锚点一致；收录 h2/h3）+ `components/blog/table-of-contents.tsx`（滚动高亮、可收起为竖直细条、当前项自动滚入可视区）；布局 `xl:max-w-6xl + justify-between` 右靠。
  3. **列表排序**：`lib/post-sort.ts` + `components/blog/post-sort-control.tsx`（标题右侧「排序」按钮 → 双列弹层：指标 × 正序/逆序；URL 驱动 `/blog?sort=&order=`；**正序=默认展示序（时间新→旧、数量多→少）**，逆序反之）。
  - 内容同步：从服务器拉回 4 篇文章 + 8 条动态 + uploads 图片（**Windows bsdtar 解不了 Linux 的 UTF-8 中文名 tar，须用 Python tarfile 解压**）。
- 上一轮改动（**已部署 2026-09-17**）：科技资讯快报模块上线（commit `5bbb4de`）——
  1. **glance-of-tech 服务部署**：`/var/www/glance-of-tech/glance-of-tech.jar`（Java 17，服务器已装 openjdk-17-jre-headless），systemd 单元 `glance-of-tech`（`-Xmx320m -Duser.timezone=Asia/Shanghai`），监听 `127.0.0.1:8081`；密钥在 `/var/www/glance-of-tech/.env`（chmod 600，含 `LLM_API_KEY`/`GLANCE_ADMIN_TOKEN`/`GLANCE_DB_PATH`，**勿提交 git**）；SQLite 在 `/var/www/glance-of-tech/data/glance.db`。手动补跑：`curl -X POST -H "X-Admin-Token: <token>" "http://127.0.0.1:8081/api/admin/digest/regenerate?period=morning|evening"`（异步 202）。定时 08:00/20:00 自动生成。
  2. **博客侧**：`lib/digest.ts`（fetch 服务 API，revalidate 300s、8s 超时、失败返回 null 走降级态）+ `components/digest/digest-view.tsx`（分源分组 + mono 编号条目 + v2-tag）+ `app/digest/page.tsx`（最新+归档）+ `app/digest/[date]/[period]/page.tsx`（详情）+ 侧边栏 RSS 旁「快报」按钮（Newspaper 图标）+ `/updates` 页 `?tab=` 分栏（网站动态/科技动态）+ 首页 `// LATEST_UPDATES` 双模式切换（科技快讯默认，2 分钟自动轮换，手动切换重置计时）。
  3. **日报 RSS**（commit `af3a347`）：`app/digest/feed.xml/route.ts` —— 每天 08:15（Asia/Shanghai）后出现一条「科技资讯日报」（= 前一日晚报 + 今日早报，按来源分组、CDATA content:encoded、pubDate=当日 08:15+08:00）；`lib/digest.ts` 的 `getDailyDigests()` 负责聚合；`/digest` 页加自动发现（alternates.types，含博客主 feed）与「RSS 订阅日报」入口；首期 2026-09-17 已上线（38+35 条）。
  - 坑：`lib/digest.ts` 的 AbortSignal **必须每次请求新建**（模块级共享的 `AbortSignal.timeout` 8s 后永久 aborted，会打崩流式渲染导致连接重置）。
- 上一轮改动：探索 hero 收尾两项（commit `1c1b5df`）——
  1. **HTML 侧 InfBlog 字样全部隐藏**：shader 已渲染折射 InfBlog 大字，`.v2-hero-title`（h1）与打字机 kicker（TypedHeading，加 `v2-hero-typed` 类）在 `.webgl-on` 下均 `display:none`；两行副文案（用户自改文案「Take Me To See What I Can't Reach ... - Infinitely」/「去编织意义，去留下痕迹」，勿覆盖）移出 shader 色带——窄屏沉 hero 底部（justify-end），lg 锚定 `top:68%`（色带下缘 ~64%），不再叠在大字上；WebGL 不可用时整块照旧居中兜底。
  2. **收起侧边栏防闪烁**：`moon-scene.ts` resize() 实际改尺寸后若 ready&&!paused 同帧补绘 `render(lastT)`，消除 backing store 重设的黑帧（此前已加 RO 观察画布自身解决布局拉伸）。
  - 验收：tsc/build 过；playwright 实测 kicker/h1 display:none、副文案落在色带下方（668–730px）、收侧边栏连拍 10 帧月亮区最低亮度 67（黑帧阈值 ~10）无闪烁；服务器 build=0、local3000/site 200、线上含 v2-hero-typed 标记。
- 上一轮改动：探索 hero 画布两处修复——
  1. **侧边栏收起不再压缩画布**：`moon-scene.ts` 内置 ResizeObserver 观察画布自身（侧边栏 280↔80 是 padding 过渡，不触发 window.resize，原实现 backing store 停在旧宽度导致画面拉伸）；`hero-moon-canvas.tsx` 的 window resize 监听已删（RO 覆盖）。
  2. **hero 全出血铺满**：`.v2-hero-night` 加 `-mx-4 -mt-6 md:-mx-6 lg:-mx-8`（负 margin 抵消 main 的 px/py 内边距）+ 同值 px 补偿内容缩进，min-h 由 `calc(100svh-5rem)` 改 `calc(100svh-3.5rem)`；EARTH_RADIO 块 `lg:right-0`→`lg:right-8`。画布顶缘=导航栏下缘（57px）、左右到视口边缘、底到 100svh，不再露出 `.v2-grid` 星野条。
  - 验收：typecheck/build 过；playwright 实测画布 top=57、收起侧边栏前后 backing/css 比例恒 1.000、截图无星野露头。
- 上一轮改动：经典首页/顶栏四项体验修复——
  1. **最新文章上移**：经典主题 grid 原用跨行 item（右列 row-span-2），右列高度会把左列行轨道等分撑高（行1 224→348px），顶部留 ~124px 莫名空白；改为左右两个独立纵向列（左=hero+最新文章 `flex flex-col gap-8`，右=播放器+widgets），空白回到精确 gap-8。
  2. **展开导航按钮 → 老式拉线开关**：`NavbarExpandButton` 重做为从视口上缘垂下的细线+开关拉珠（`fixed right-10 top-0 md:right-14`，即导航栏最右侧偏左）；悬浮线拉长/拉珠下沉并弹「展开导航」mono 小提示，单击拉珠下坠回弹（pulling state 450ms）同时顶栏落下；顶栏可见时整根线 -translate-y-20 收出视口。语义＝"拉一下开灯"。
  3. **顶栏下缘热区**：navbar header 内 `absolute top-full` 的全宽 h-3 热区按钮，悬浮弹出「∧ 单击收起导航栏」胶囊提示，单击 `collapse()` 手动收起（随顶栏 -translate-y-full 一起滑走）。visibility context 新增 `collapse` 方法。
  4. **首页滚动不收顶栏**：`NavbarVisibilityProvider` 滚动效果内 `pathname === "/"` 时向下滚动 exempt（accUp 仍清零），其他页面照常 HIDE_DELTA/MIN_HIDE_SCROLL_Y 收起；首页手动收起后向上滚仍会展开。
  - 验收：typecheck/build 过；playwright 实测 heroBottom→h2Top 空白=32px、首页滚 800 顶栏不收、热区单击收起、拉线开关单击展开、/blog 滚 900 照常收起；浅色/深色拉珠截图均清晰。
- 上一轮改动：旧「FAR SIDE/月之暗面」CSS hero 已删除（globals.css 819–1022 行块 + `hero-moon.tsx`/`gravity-title.tsx`），探索 hero 由 `components/home/hero-moon-canvas.tsx` + `components/theme/moon-scene.ts` WebGL 场景渲染，`explore-dark-sync.tsx` 强制深色。
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
