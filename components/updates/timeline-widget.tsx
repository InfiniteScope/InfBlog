"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import ReactMarkdown from "react-markdown"
import { ArrowRight, ExternalLink, Newspaper, Sparkles } from "lucide-react"

import type { Update } from "@/lib/updates"
import type { Digest } from "@/lib/digest"
import { cn } from "@/lib/utils"

const ROTATE_MS = 2 * 60 * 1000

interface TimelineWidgetProps {
  updates: Update[]
  digest: Digest | null
}

/**
 * 首页 LATEST_UPDATES 部件：科技快讯 / 网站动态 双模式。
 * 默认科技快讯；右上方切换按钮；每 2 分钟自动轮换（手动切换会重置计时）。
 */
export function TimelineWidget({ updates, digest }: TimelineWidgetProps) {
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
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-sm tracking-wide text-muted-foreground">
          {mode === "tech" ? (
            <Newspaper className="h-3.5 w-3.5 text-accent" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-accent" />
          )}
          // LATEST_UPDATES
        </h3>
        <div className="flex items-center gap-1">
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
      </div>

      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {mode === "tech" && digest ? (
          <TechFeed digest={digest} />
        ) : (
          <SiteTimeline updates={updates} />
        )}
      </motion.div>
    </div>
  )
}

function TechFeed({ digest }: { digest: Digest }) {
  return (
    <div className="space-y-3">
      <Link
        href={`/digest/${digest.date}/${digest.period}`}
        className="block rounded-xl border border-border bg-card/50 p-3 transition-colors hover:border-accent/40 hover:bg-card"
      >
        <p className="mb-1 flex items-center gap-2 font-mono text-[10px] text-accent">
          {digest.date} · {digest.period === "morning" ? "早报" : "晚报"}
        </p>
        <p className="text-sm font-medium leading-snug">{digest.title}</p>
        {digest.summary && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {digest.summary}
          </p>
        )}
      </Link>

      <ul className="space-y-2">
        {digest.items.slice(0, 5).map((item) => (
          <li
            key={item.url}
            className="flex items-start gap-2 text-sm leading-snug"
          >
            <span className="mt-0.5 shrink-0 rounded border border-border/60 px-1 py-px font-mono text-[9px] uppercase tracking-wide text-muted-foreground/70">
              {item.source}
            </span>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group min-w-0 transition-colors hover:text-accent"
            >
              <span className="line-clamp-2">{item.title}</span>
              <ExternalLink className="mb-0.5 ml-1 inline h-3 w-3 opacity-30 transition-opacity group-hover:opacity-100" />
            </a>
          </li>
        ))}
      </ul>

      <Link
        href="/digest"
        className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-accent"
      >
        查看全部快报
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}

function SiteTimeline({ updates }: { updates: Update[] }) {
  return (
    <div className="relative space-y-0">
      {/* Glowing vertical line */}
      <div className="absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-accent/60 via-accent/30 to-transparent" />

      {updates.map((update, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.4,
            delay: index * 0.1,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="group relative pl-8 py-3"
        >
          {/* Node */}
          <span className="absolute left-[9px] top-4 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background bg-accent shadow-[0_0_8px_hsl(var(--accent)/0.5)] transition-shadow group-hover:shadow-[0_0_12px_hsl(var(--accent)/0.8)]">
            <span className="h-1 w-1 rounded-full bg-background" />
          </span>

          <div className="rounded-xl border border-border bg-card/50 p-3 transition-colors hover:border-accent/40 hover:bg-card">
            <p className="mb-1 text-[10px] font-mono text-accent">
              {new Date(update.date).toLocaleDateString("zh-CN")}
            </p>
            {update.title && (
              <p className="mb-1 text-sm font-medium leading-snug">
                {update.title}
              </p>
            )}
            <div className="space-y-2 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:leading-relaxed [&_ul]:ml-5 [&_ul]:list-disc">
              <ReactMarkdown>{update.content}</ReactMarkdown>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
