import type { Metadata } from "next"

import "@fontsource/inter/400.css"
import "@fontsource/inter/500.css"
import "@fontsource/inter/700.css"
import "@fontsource/noto-sans-sc/400.css"
import "@fontsource/noto-sans-sc/500.css"
import "@fontsource/noto-sans-sc/700.css"
import "@fontsource/jetbrains-mono/400.css"
import "@fontsource/jetbrains-mono/500.css"
import "@chinese-fonts/dyh/dist/SmileySans-Oblique/result.css"
import "@fontsource/orbitron/500.css"
import "@fontsource/orbitron/700.css"
import "katex/dist/katex.min.css"
import "./globals.css"
import { Toaster } from "sonner"

import { CardWelcome } from "@/components/card-welcome"
import { ThemeProvider } from "@/components/theme-provider"
import { UiThemeTransitionProvider } from "@/components/theme/ui-theme-transition"
import { SessionProvider } from "@/components/session-provider"
import { Shell } from "@/components/layout/shell"
import { BackgroundProvider } from "@/components/theme/background-provider"
import { Background } from "@/components/theme/background"
import { TimePrecisionProvider } from "@/components/time/time-precision-provider"
import { LoginReturnTracker } from "@/components/login-return-tracker"
import { ViewsTracker } from "@/components/views-tracker"
import { CollectibleReveal } from "@/components/collectibles/collectible-reveal"
import { StarfieldCanvas } from "@/components/theme/starfield-canvas"

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_TITLE || "InfBlog",
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "一个关于技术与思考的个人博客",
  alternates: {
    types: { "application/rss+xml": "/feed.xml" },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      {/* suppressHydrationWarning：浏览器扩展会向 body 注入 style（如 zoom），
          本地代码无 SSR/CSR 差异，避免误报警告 */}
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* UI 主题：渲染前应用经典标记，避免新旧界面闪烁。默认经典；
            「探索」= 无 ui-classic 类 + 强制深色；切回经典时还原用户偏好。
            支持 ?ui=explore / ?ui=classic 覆盖并记忆。

            ⚠️ 两条纪律，都是踩过的坑：
            1. 只有"真的带了 ?ui= 参数"才写 infblog-ui。曾经把"没有参数"也当成
               "切经典"，于是中键在新标签打开任何导航链接（href 不带参数）都会
               删掉这个**跨标签共享**的 key，原标签的探索主题被改掉。
            2. **本脚本绝不写 `theme` / `infblog-prev-theme`**。唯一写 theme 的
               地方是用户自己点深浅色开关。next-themes 的 setTheme 写的是共享
               localStorage("theme")，而它自己也监听 storage 事件——任何一次
               多余写入都会广播给所有标签页，表现就是"另一个界面被切换"
               （用户报告的中键切主题现象）。
               探索的"强制深色"改为由 ThemeProvider 的 forcedTheme 承担（只在
               内存里覆盖、不落盘），用户偏好因此永不被污染。 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{
var p=new URLSearchParams(location.search).get("ui");
if(p){
  if(p==="explore"||p==="v2")localStorage.setItem("infblog-ui","explore");
  else if(p==="classic"||p==="legacy")localStorage.removeItem("infblog-ui");
}
if(localStorage.getItem("infblog-ui")==="explore"){
  document.documentElement.classList.remove("ui-classic");
  document.documentElement.classList.add("dark")
}else{
  document.documentElement.classList.add("ui-classic")
}
}catch(e){}`,
          }}
        />
        <SessionProvider>
          <ThemeProvider>
            <UiThemeTransitionProvider>
              <Toaster theme="system" position="top-center" richColors />
        {/* 书签等底部提示专用（全局 toasts 保持顶部居中不变）。
            宽度用 style 传 --width：sonner 没有 width prop（TOAST_WIDTH 硬编码 356），
            而它是通过**行内样式**写 var(--width) 的，外部 CSS 覆盖不了；
            356px 减去图标与两个按钮后文本区只剩 147px，描述会折行。 */}
        <Toaster
          id="bottom-toaster"
          theme="system"
          position="bottom-center"
          richColors
          style={{ "--width": "430px" } as React.CSSProperties}
        />
            <CollectibleReveal />
            <LoginReturnTracker />
            <ViewsTracker />
            <CardWelcome />
            <BackgroundProvider>
              <TimePrecisionProvider>
                <Background />
                {/* v2 蓝图网格纹理（legacy/flow 模式下自动隐藏） */}
                <div className="v2-grid" aria-hidden />
                {/* 探索主题程序化星野（银河带+独立闪烁，深色/非经典/非心流时显示） */}
                <StarfieldCanvas />
                <Shell>{children}</Shell>
              </TimePrecisionProvider>
            </BackgroundProvider>
            </UiThemeTransitionProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
