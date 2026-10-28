"use client"

import Link from "next/link"
import { toast } from "sonner"
import {
  Github,
  MapPin,
  Mail,
  GraduationCap,
  AtSign,
  Rss,
  Newspaper,
  TrainFront,
} from "lucide-react"

import { siteConfig } from "@/lib/config"
import { cn } from "@/lib/utils"
import { useSidebarCollapse } from "@/components/layout/sidebar-collapse-provider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SectionHeading } from "@/components/ui/section-heading"
import { ChillButton } from "@/components/layout/chill-button"
import { CollapsibleLinkList } from "@/components/layout/collapsible-link-list"
import { ShatterAvatar } from "@/components/collectibles/shatter-avatar"
import { DanmakuList } from "@/components/danmaku/danmaku-list"
import { DanmakuForm } from "@/components/danmaku/danmaku-form"
import type { Danmaku } from "@prisma/client"

/** Bilibili 小电视图标（icons8 PNG，CSS 染灰与文字统一） */
function BilibiliIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/bilibili.png"
      alt=""
      aria-hidden
      className={className}
      style={{ filter: "grayscale(1) brightness(0.45)", width: 20, height: 20 }}
    />
  )
}

/**
 * 开往（Travellings）友链接力入口。
 *
 * 加入条件明确要求把外链放在「打开网站就能看到的地方」（顶栏/侧栏），
 * 所以这个按钮**不放进折叠的 // LINKS 面板**，而是紧跟社交按钮组，
 * 且侧栏收起成图标态时依然保留（移动端也走同一个侧栏），确保任何
 * 断点下访客都找得到。
 *
 * 图标用 Lucide 的火车（官方首选语义是「火车/地铁」，次选「火箭/飞船」；
 * 唯一明确不推荐的是纸飞机，易与 Telegram 混淆）。线性单色图标与
 * 本站按钮风格统一，比彩色 emoji 更协调。
 */
const TRAVELLINGS_URL = "https://www.travellings.cn/go.html"

interface SidebarProps {
  className?: string
  danmaku: Pick<Danmaku, "id" | "content" | "color" | "createdAt">[]
}

export function Sidebar({ className, danmaku }: SidebarProps) {
  const { collapsed } = useSidebarCollapse()

  const copyEmail = async () => {
    // siteConfig.email = "gmail\nqq"（换行分隔），复制 QQ 邮箱
    const emails = siteConfig.email.split("\n").map((e) => e.trim())
    const target = emails[emails.length > 1 ? 1 : 0]
    try {
      await navigator.clipboard.writeText(target)
      toast.success("QQ 邮箱已复制到剪贴板")
    } catch {
      toast.error("复制失败，请手动复制")
    }
  }

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col gap-6 overflow-y-auto p-6",
        collapsed && "items-center px-2",
        className
      )}
    >
      {/* Profile */}
      <div
        className={cn(
          "flex items-start gap-4",
          collapsed && "flex-col items-center"
        )}
      >
        <div
          className="rounded-full border border-border"
          style={{ width: 64, height: 64 }}
        >
          <ShatterAvatar size={64} src={siteConfig.avatar} />
        </div>
        {!collapsed && (
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-xl tracking-tight">
              {siteConfig.nickname}
            </h2>
            <ChillButton />
          </div>
        )}
      </div>

      {/* Personal Info */}
      {!collapsed && (
        <div className="v2-panel space-y-3">
          <SectionHeading>// PERSONAL_INFO</SectionHeading>
          <ul className="space-y-3 text-sm">
            <li className="flex items-baseline gap-2 leading-relaxed text-muted-foreground">
              <AtSign className="h-3.5 w-3.5 shrink-0 self-center text-muted-foreground" />
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                NAME
              </span>
              <span className="text-foreground">{siteConfig.realName}</span>
            </li>
            <li className="flex items-start gap-2 leading-relaxed text-muted-foreground">
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="whitespace-pre-line text-foreground">{siteConfig.email}</span>
            </li>
            <li className="flex items-start gap-2 leading-relaxed text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-foreground">{siteConfig.location}</span>
            </li>
            <li className="flex items-start gap-2 leading-relaxed text-muted-foreground">
              <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-foreground">{siteConfig.education}</span>
            </li>
          </ul>
        </div>
      )}

      {/* Social buttons: GitHub (full row) / Bilibili & Email (half row) */}
      <div className={cn("grid gap-2", collapsed ? "grid-cols-1" : "grid-cols-2")}>
        <Button
          variant="outline"
          className={cn(
            "gap-2",
            collapsed && "h-9 w-11 gap-0 px-0",
            !collapsed && "col-span-2 justify-center"
          )}
          asChild
        >
          <Link
            href={siteConfig.github}
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub 主页"
          >
            <Github className="h-4 w-4 shrink-0" />
            {!collapsed && "GitHub 主页"}
          </Link>
        </Button>

        {siteConfig.bilibili && (
          <Button
            variant="outline"
            className={cn(
              "gap-2",
              collapsed && "h-9 w-11 gap-0 px-0",
              !collapsed && "justify-center"
            )}
            asChild
          >
            <Link
              href={siteConfig.bilibili}
              target="_blank"
              rel="noopener noreferrer"
              title="Bilibili 主页"
            >
              <BilibiliIcon className="shrink-0" />
              {!collapsed && "Bilibili"}
            </Link>
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          className={cn(
            "gap-2",
            collapsed && "h-9 w-11 gap-0 px-0",
            !collapsed && "justify-center"
          )}
          onClick={copyEmail}
          title="复制邮箱"
        >
          <Mail className="h-4 w-4 shrink-0" />
          {!collapsed && "邮箱"}
        </Button>

        <Button
          variant="outline"
          className={cn(
            "gap-2",
            collapsed && "h-9 w-11 gap-0 px-0",
            !collapsed && "justify-center"
          )}
          asChild
        >
          {/* RSS 是 XML 资源，不是页面：用原生 <a>，避免 Next 把它当页面预取
              （曾实测预取一次就拉 220KB 的 /feed.xml?_rsc=…） */}
          <a href="/feed.xml" target="_blank" rel="noopener noreferrer" title="RSS 订阅博客">
            <Rss className="h-4 w-4 shrink-0" />
            {!collapsed && "RSS"}
          </a>
        </Button>

        {/* 快报：glance-of-tech 服务的临时入口（内部页，不新开标签） */}
        <Button
          variant="outline"
          className={cn(
            "gap-2",
            collapsed && "h-9 w-11 gap-0 px-0",
            !collapsed && "justify-center"
          )}
          asChild
        >
          <Link href="/digest" title="科技资讯快报">
            <Newspaper className="h-4 w-4 shrink-0" />
            {!collapsed && "快报"}
          </Link>
        </Button>

        {/* 开往（友链接力）：必须放在折叠面板之外，保证「开站即可见」。
            放在这个 grid 内部（而非 aside 的 flex 子项），才能和上面的社交
            按钮共用 gap-2 的间距——否则会吃到 aside 的 gap-6，显得比别的
            按钮松一截。展开时跨两列，与「GitHub 主页」同宽。 */}
        <Button
          variant="outline"
          className={cn(
            "gap-2",
            collapsed && "h-9 w-11 gap-0 px-0",
            !collapsed && "col-span-2 justify-center"
          )}
          asChild
        >
          <a
            href={TRAVELLINGS_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="本博客已加入 开往 Travelling 个人博客互助项目；点击后可随机抵达下一个个人博客"
          >
            <TrainFront className="h-4 w-4 shrink-0" />
            {!collapsed && "开往下一站 Travelling"}
          </a>
        </Button>
      </div>

      {/* Tools & Friends */}
      {!collapsed && (
        <div className="v2-panel space-y-3">
          <SectionHeading>// LINKS</SectionHeading>
          <div className="space-y-3">
            <div>
              <p className="mb-2 font-mono text-xs text-muted-foreground">TOOLS - 实用网站</p>
              <CollapsibleLinkList links={siteConfig.links.tools} />
            </div>
            <Separator />
            <div>
              <p className="mb-2 font-mono text-xs text-muted-foreground">FRIENDS - 友情链接</p>
              <CollapsibleLinkList links={siteConfig.links.friends} />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Danmaku */}
      {!collapsed && (
        <div className="v2-panel space-y-3">
          <SectionHeading>// DANMAKU</SectionHeading>
          <div className="h-24 overflow-hidden rounded-md border border-border bg-background/50 px-3 py-2">
            <DanmakuList danmaku={danmaku} />
          </div>
          <DanmakuForm />
        </div>
      )}
    </aside>
  )
}
