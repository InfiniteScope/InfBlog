"use client"

import { useEffect, useState } from "react"
import { ChevronRight, ListTree } from "lucide-react"

import type { TocHeading } from "@/lib/headings"
import { cn } from "@/lib/utils"

interface TableOfContentsProps {
  headings: TocHeading[]
}

/**
 * 文章右侧「本页目录」：滚动监听高亮当前章节，可收起为细条。
 * 高亮判定用「最后一个 top <= 偏移线」的标题；页面触底时兜底高亮末条。
 */
export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? "")
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0) return

    let raf = 0
    const compute = () => {
      raf = 0
      const offset = 96
      let current = elements[0].id
      for (const el of elements) {
        if (el.getBoundingClientRect().top <= offset) {
          current = el.id
        }
      }
      const doc = document.documentElement
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
        current = elements[elements.length - 1].id
      }
      setActiveId(current)
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute)
    }

    compute()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [headings])

  // 当前项滚出目录可视区时，保持它在目录列表内可见（不扰动页面滚动）
  useEffect(() => {
    if (collapsed) return
    const active = document.querySelector(
      `nav[aria-label="本页目录"] a[data-active="true"]`
    )
    active?.scrollIntoView({ block: "nearest" })
  }, [activeId, collapsed])

  if (headings.length < 3) return null

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="展开目录"
        title="展开目录"
        className="flex w-9 flex-col items-center gap-2 rounded-md border border-border/60 bg-card/40 py-3 text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
      >
        <ListTree className="h-4 w-4" />
        <span className="font-mono text-[10px] tracking-widest [writing-mode:vertical-rl]">
          目录
        </span>
      </button>
    )
  }

  return (
    <nav aria-label="本页目录" className="w-44 text-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-mono text-xs tracking-widest text-accent">
          // ON_THIS_PAGE
        </p>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="收起目录"
          title="收起目录"
          className="text-muted-foreground/60 transition-colors hover:text-accent"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <ul className="max-h-[calc(100vh-10rem)] space-y-0.5 overflow-y-auto border-l border-border/60">
        {headings.map((heading, index) => {
          const active = activeId === heading.id
          return (
            <li key={`${heading.id}-${index}`}>
              <a
                href={`#${heading.id}`}
                title={heading.text}
                data-active={active ? "true" : undefined}
                className={cn(
                  "-ml-px block border-l-2 py-1 leading-snug transition-colors",
                  heading.depth === 3 ? "pl-6 text-[13px]" : "pl-3",
                  active
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="line-clamp-2">{heading.text}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
