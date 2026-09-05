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
import "katex/dist/katex.min.css"
import "./globals.css"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "@/components/session-provider"
import { Shell } from "@/components/layout/shell"
import { BackgroundProvider } from "@/components/theme/background-provider"
import { Background } from "@/components/theme/background"
import { TimePrecisionProvider } from "@/components/time/time-precision-provider"
import { LoginReturnTracker } from "@/components/login-return-tracker"
import { ViewsTracker } from "@/components/views-tracker"
import { CollectibleReveal } from "@/components/collectibles/collectible-reveal"

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_TITLE || "InfBlog",
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "一个关于技术与设计的个人博客",
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
            「探索」= 无 ui-classic 类。支持 ?ui=explore / ?ui=classic 覆盖并记忆 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=new URLSearchParams(location.search).get("ui");if(p==="explore"||p==="v2")localStorage.setItem("infblog-ui","explore");else if(p==="classic"||p==="legacy")localStorage.removeItem("infblog-ui");if(localStorage.getItem("infblog-ui")==="explore"){document.documentElement.classList.remove("ui-classic")}else{localStorage.removeItem("infblog-ui");document.documentElement.classList.add("ui-classic")}}catch(e){}`,
          }}
        />
        <SessionProvider>
          <ThemeProvider>
            <Toaster theme="system" position="top-center" richColors />
            <CollectibleReveal />
            <LoginReturnTracker />
            <ViewsTracker />
            <BackgroundProvider>
              <TimePrecisionProvider>
                <Background />
                {/* v2 蓝图网格纹理（legacy/flow 模式下自动隐藏） */}
                <div className="v2-grid" aria-hidden />
                <Shell>{children}</Shell>
              </TimePrecisionProvider>
            </BackgroundProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
