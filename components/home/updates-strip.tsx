"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { ArrowRight, ExternalLink, Newspaper, Sparkles } from "lucide-react"
import { motion } from "motion/react"

import type { Update } from "@/lib/updates"
import type { Digest } from "@/lib/digest"
import { cn } from "@/lib/utils"

const ROTATE_MS = 2 * 60 * 1000

interface UpdatesStripProps {
  updates: Update[]
  digest: Digest | null
}

/**
 * 最新动态的横向滚动带：科技快讯 / 网站动态 双模式
 * （与经典主题 LATEST_UPDATES 同策略：默认科技快讯、2 分钟自动轮换、
 * 手动切换重置计时）。scroll-snap + 隐藏滚动条 + 右缘渐隐。
 */
export function UpdatesStrip({ updates, digest }: UpdatesStripProps) {
  const [mode, setMode] = useState<"tech" | "site">(digest ? "tech" : "site")

  useEffect(() => {
    if (!digest || updates.length === 0) return
    const id = setTimeout(
      () => setMode((m) => (m === "tech" ? "site" : "tech")),
      ROTATE_MS
    )
    return () => clearTimeout(id)
  }, [mode, digest, updates.length])

  return (
    <div className="space-y-3">
      {/* 模式切换 + 横向滚动提示（自带一行，不与右下角悬浮件争空间） */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {mode === "tech" ? (
            <Newspaper className="mr-1 h-3.5 w-3.5 text-accent" />
          ) : (
            <Sparkles className="mr-1 h-3.5 w-3.5 text-accent" />
          )}
          <button
            type="button"
            onClick={() => setMode("tech")}
            disabled={!digest}
            className={cn(
              "v2-tag cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              mode === "tech" && "!border-accent/40 !text-accent"
            )}
          >
            科技快讯
          </button>
          <button
            type="button"
            onClick={() => setMode("site")}
            className={cn(
              "v2-tag cursor-pointer transition-colors",
              mode === "site" && "!border-accent/40 !text-accent"
            )}
          >
            网站动态
          </button>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
          Scroll →
        </span>
      </div>

      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {mode === "tech" && digest ? (
          <TechDigestStrip digest={digest} />
        ) : (
          <SiteUpdatesStrip updates={updates} />
        )}
      </motion.div>
    </div>
  )
}

function SiteUpdatesStrip({ updates }: { updates: Update[] }) {
  return (
    <div className="v2-strip -mx-2 px-2">
      {updates.map((update, index) => (
        <article
          key={index}
          className="v2-card flex w-[280px] shrink-0 flex-col gap-2 p-4 sm:w-[320px]"
        >
          <p className="font-mono text-[10px] tracking-wide text-accent">
            {new Date(update.date).toLocaleDateString("zh-CN")}
          </p>
          {update.title && (
            <p className="text-sm font-medium leading-snug">{update.title}</p>
          )}
          <div className="text-sm leading-relaxed text-muted-foreground line-clamp-3 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:leading-relaxed [&_ul]:ml-5 [&_ul]:list-disc">
            <ReactMarkdown>{update.content}</ReactMarkdown>
          </div>
        </article>
      ))}
    </div>
  )
}

function TechDigestStrip({ digest }: { digest: Digest }) {
  return (
    <div className="v2-strip -mx-2 px-2">
      {/* 摘要卡：链到快报详情 */}
      <Link
        href={`/digest/${digest.date}/${digest.period}`}
        className="v2-card flex w-[300px] shrink-0 flex-col gap-2 p-4 sm:w-[340px]"
      >
        <p className="font-mono text-[10px] tracking-wide text-accent">
          {digest.date} · {digest.period === "morning" ? "早报" : "晚报"}
        </p>
        <p className="text-sm font-medium leading-snug">{digest.title}</p>
        {digest.summary && (
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-4">
            {digest.summary}
          </p>
        )}
      </Link>

      {/* 条目卡 */}
      {digest.items.slice(0, 5).map((item) => (
        <a
          key={item.url}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="v2-card group flex w-[240px] shrink-0 flex-col gap-2 p-4 sm:w-[280px]"
        >
          <span className="w-fit rounded border border-border/60 px-1 py-px font-mono text-[9px] uppercase tracking-wide text-muted-foreground/70">
            {item.source}
          </span>
          <span className="text-sm leading-snug line-clamp-3">
            {item.title}
            <ExternalLink className="mb-0.5 ml-1 inline h-3 w-3 opacity-30 transition-opacity group-hover:opacity-100" />
          </span>
        </a>
      ))}

      {/* 全部快报 */}
      <Link
        href="/digest"
        className="v2-card flex w-[140px] shrink-0 flex-col items-center justify-center gap-1.5 p-4 font-mono text-xs text-muted-foreground transition-colors hover:text-accent"
      >
        查看全部快报
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
