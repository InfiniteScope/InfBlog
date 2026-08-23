"use client"

import Link from "next/link"
import { toast } from "sonner"
import {
  Github,
  MapPin,
  Mail,
  GraduationCap,
  AtSign,
} from "lucide-react"

import { siteConfig } from "@/lib/config"
import { cn } from "@/lib/utils"
import { useSidebarCollapse } from "@/components/layout/sidebar-collapse-provider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ChillButton } from "@/components/layout/chill-button"
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
        <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
          <h3 className="font-display text-sm tracking-wide text-muted-foreground">
            // PERSONAL_INFO
          </h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-baseline gap-2 leading-relaxed text-muted-foreground">
              <AtSign className="h-3.5 w-3.5 shrink-0 self-center text-accent" />
              <span className="shrink-0 font-mono text-xs text-accent">
                NAME
              </span>
              <span className="text-foreground">{siteConfig.realName}</span>
            </li>
            <li className="flex items-start gap-2 leading-relaxed text-muted-foreground">
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <span className="whitespace-pre-line text-foreground">{siteConfig.email}</span>
            </li>
            <li className="flex items-start gap-2 leading-relaxed text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <span className="text-foreground">{siteConfig.location}</span>
            </li>
            <li className="flex items-start gap-2 leading-relaxed text-muted-foreground">
              <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
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
      </div>

      {/* Tools & Friends */}
      {!collapsed && (
        <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
          <h3 className="font-display text-sm tracking-wide text-muted-foreground">
            // LINKS
          </h3>
          <div className="space-y-3">
            <div>
              <p className="mb-2 font-mono text-xs text-accent">TOOLS - 实用网站</p>
              <div className="flex flex-wrap gap-2">
                {siteConfig.links.tools.map((link) => (
                  <Button
                    key={link.name}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    asChild
                  >
                    <Link
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.name}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <p className="mb-2 font-mono text-xs text-accent">FRIENDS - 友情链接</p>
              <div className="flex flex-wrap gap-2">
                {siteConfig.links.friends.map((link) => (
                  <Button
                    key={link.name}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    asChild
                  >
                    <Link
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.name}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Danmaku */}
      {!collapsed && (
        <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
          <h3 className="font-display text-sm tracking-wide text-muted-foreground">
            // DANMAKU
          </h3>
          <div className="h-24 overflow-hidden rounded-md border border-border bg-background/50 px-3 py-2">
            <DanmakuList danmaku={danmaku} />
          </div>
          <DanmakuForm />
        </div>
      )}
    </aside>
  )
}
