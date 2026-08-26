import { getDanmakuList } from "@/app/danmaku/actions"
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
            <footer className="mt-10 border-t border-border/40 pt-4 pb-2 text-center text-xs text-muted-foreground">
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
              >
                蜀ICP备2026049684号
              </a>
            </footer>
          </main>
          <BackToTop />
        </FlowProvider>
      </SidebarCollapseProvider>
    </MusicProvider>
  )
}
