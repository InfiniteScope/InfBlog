"use client"

import { useEffect, useState } from "react"

import type { TocHeading } from "@/lib/headings"
import { cn } from "@/lib/utils"

interface TableOfContentsProps {
  headings: TocHeading[]
}

/**
 * 文章右侧「本页目录」：滚动监听高亮当前章节。
 * 高亮判定用「最后一个 top <= 偏移线」的标题；页面触底时兜底高亮末条。
 */
export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? "")

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

  if (headings.length < 3) return null

  return (
    <nav aria-label="本页目录" className="text-sm">
      <p className="mb-3 font-mono text-xs tracking-widest text-accent">
        // ON_THIS_PAGE
      </p>
      <ul className="max-h-[calc(100vh-10rem)] space-y-0.5 overflow-y-auto border-l border-border/60">
        {headings.map((heading, index) => {
          const active = activeId === heading.id
          return (
            <li key={`${heading.id}-${index}`}>
              <a
                href={`#${heading.id}`}
                title={heading.text}
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
