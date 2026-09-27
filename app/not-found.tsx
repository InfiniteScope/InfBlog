import Link from "next/link"
import { Home, BookMarked, FileText, Package, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"

/** 全站 404：统一站点风格 + 去向引导 */
export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 py-16 text-center md:py-24">
      <p className="font-mono text-xs tracking-widest text-accent">
        // 404_NOT_FOUND
      </p>

      <div className="select-none font-display text-[7rem] leading-none tracking-tight text-foreground/90 md:text-[10rem]">
        4
        <span className="text-accent">0</span>4
      </div>

      <div className="space-y-2">
        <p className="text-lg text-foreground">
          页面迷失在了月之暗面
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          它可能被移动、删除，或从未存在过。试试下面这些地方：
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <Button asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            回到首页
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/blog">
            <FileText className="mr-2 h-4 w-4" />
            去博客
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/docs">
            <BookMarked className="mr-2 h-4 w-4" />
            去文库
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/resources">
            <Package className="mr-2 h-4 w-4" />
            资源分享
          </Link>
        </Button>
      </div>

      <p className="flex items-center gap-1 font-mono text-xs text-muted-foreground/70">
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">
          Ctrl
        </kbd>
        +
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">
          K
        </kbd>
        打开全局搜索
        <ArrowRight className="h-3 w-3" />
      </p>
    </div>
  )
}
