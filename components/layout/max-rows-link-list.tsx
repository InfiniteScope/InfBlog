"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"

interface MaxRowsLinkListProps {
  links: { name: string; url: string }[]
  /** 最多显示几行，超过则折叠并显示「更多」入口 */
  maxRows?: number
  /** 折叠时「更多」按钮跳转到的地址（通常是带锚点的页面） */
  moreHref: string
  moreLabel?: string
}

/** 与下方 Button 的 h-7 一致 */
const ROW_HEIGHT = 28
/** 与 gap-2 一致 */
const ROW_GAP = 8

/**
 * 限高链接列表：最多显示 maxRows 行，放不下时在下方给出一个「所有友链」入口。
 *
 * 为什么用 JS 量而不是纯 CSS：CSS 只能判断“有没有溢出”（scrollHeight），
 * 但我们要在溢出时**额外渲染**一个按钮，所以需要把结果放到 state 里。
 * 测量用最后一个子元素的 bottom 相对容器顶部是否超过 maxHeight，
 * 比 scrollHeight 更可靠（flex 换行容器在部分浏览器里 scrollHeight 表现不一致）。
 */
export function MaxRowsLinkList({
  links,
  maxRows = 2,
  moreHref,
  moreLabel = "所有友链",
}: MaxRowsLinkListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState(false)
  const maxHeight = maxRows * ROW_HEIGHT + (maxRows - 1) * ROW_GAP

  useEffect(() => {
    const el = listRef.current
    if (!el) return

    const check = () => {
      if (el.children.length === 0) {
        setOverflow(false)
        return
      }
      const top = el.getBoundingClientRect().top
      const last = el.children[el.children.length - 1] as HTMLElement
      // +1 吸收亚像素误差
      setOverflow(last.getBoundingClientRect().bottom - top > maxHeight + 1)
    }

    check()

    // 容器本身高度被 maxHeight 固定，宽度变化不一定触发它自己的 RO，
    // 所以同时观察父容器；再兜底一次窗口 resize 与字体加载完成后的重排。
    const observer = new ResizeObserver(check)
    observer.observe(el)
    if (el.parentElement) observer.observe(el.parentElement)
    window.addEventListener("resize", check)
    document.fonts?.ready.then(check).catch(() => {})

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", check)
    }
  }, [links, maxHeight])

  return (
    <div className="space-y-1.5">
      <div
        ref={listRef}
        data-friends-list
        className="flex flex-wrap gap-2 overflow-hidden"
        style={{ maxHeight }}
      >
        {links.map((link) => (
          <Button
            key={link.name}
            variant="ghost"
            size="sm"
            className="h-7 whitespace-nowrap px-2 text-xs"
            asChild
          >
            <Link href={link.url} target="_blank" rel="noopener noreferrer">
              {link.name}
            </Link>
          </Button>
        ))}
      </div>

      {overflow && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-accent hover:text-accent-foreground"
          asChild
        >
          <Link href={moreHref} data-friends-more>
            {moreLabel}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      )}
    </div>
  )
}
