import { getDanmakuList } from "@/app/danmaku/actions"
import { siteConfig } from "@/lib/config"
import { getAllPosts } from "@/lib/mdx"
import { getUnreadCount } from "@/app/messages/actions"
import { Sidebar } from "@/components/layout/sidebar"
import { Navbar } from "@/components/layout/navbar"
import { SidebarCollapseProvider } from "@/components/layout/sidebar-collapse-provider"
import { BackToTop } from "@/components/layout/back-to-top"
import { PageTransition } from "@/components/motion/page-transition"
import { MusicProvider } from "@/components/music/music-provider"
import { MusicCollapseController } from "@/components/music/music-collapse-controller"
import { MusicPlayerOverlay } from "@/components/music/music-player-overlay"
import { WeatherBar } from "@/components/weather/weather-bar"
import { FlowProvider } from "@/components/flow/flow-provider"

interface ShellProps {
  children: React.ReactNode
}

export async function Shell({ children }: ShellProps) {
  const [danmaku, posts, unreadCount] = await Promise.all([
    getDanmakuList(20),
    getAllPosts(),
    getUnreadCount(),
  ])

  return (
    <MusicProvider>
      <SidebarCollapseProvider sidebar={<Sidebar danmaku={danmaku} />}>
        <FlowProvider>
          <MusicCollapseController />
          <WeatherBar />
          <Navbar danmaku={danmaku} posts={posts} unreadCount={unreadCount} />
          <MusicPlayerOverlay />
          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
            <PageTransition>{children}</PageTransition>
            <footer className="mt-10 border-t border-border/40 pt-4 pb-2 text-center text-xs leading-relaxed text-muted-foreground">
              <p>
                Copyright © {new Date().getFullYear()} {siteConfig.nickname}. All
                Rights Reserved. {siteConfig.name} 版权所有
              </p>
              <p className="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
                <span>{siteConfig.name} ICP备案号：</span>
                <a
                  href="https://beian.miit.gov.cn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  蜀ICP备2026049684号
                </a>
                <a
                  href="https://beian.mps.gov.cn/#/query/webSearch?code=%E5%B7%9D%E5%85%AC%E7%BD%91%E5%AE%89%E5%A4%8751011202001443%E5%8F%B7"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="公安联网备案"
                  className="flex items-center gap-1 transition-colors hover:text-foreground"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/gongan.png"
                    alt=""
                    aria-hidden
                    className="h-3.5 w-3.5"
                  />
                  川公网安备51011202001443号
                </a>
              </p>
            </footer>
          </main>
          <BackToTop />
        </FlowProvider>
      </SidebarCollapseProvider>
    </MusicProvider>
  )
}
