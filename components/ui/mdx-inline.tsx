import { Fragment } from "react"

import { parseInline } from "@/lib/mdx-inline"
import { cn } from "@/lib/utils"

interface MdxInlineProps {
  /** 原始文本（可含内联 Markdown） */
  text: string
  className?: string
}

/**
 * 简介等短文本的内联 Markdown 渲染。
 * 解析逻辑在 `lib/mdx-inline.ts`（纯函数）；这里只负责把片段映射成元素——
 * 不生成 HTML 字符串、不使用 dangerouslySetInnerHTML，因此可安全用于
 * 服务端组件与客户端组件，坏语法按字面显示。
 */
export function MdxInline({ text, className }: MdxInlineProps) {
  const segments = parseInline(text)
  if (segments.length === 0) return null

  return (
    <p className={className}>
      {segments.map((seg, idx) => {
        switch (seg.type) {
          case "text":
            return <Fragment key={idx}>{seg.value}</Fragment>
          case "strong":
            return (
              <strong key={idx} className="font-semibold text-foreground">
                {seg.value}
              </strong>
            )
          case "em":
            return <em key={idx}>{seg.value}</em>
          case "del":
            return (
              <del key={idx} className="text-muted-foreground/70">
                {seg.value}
              </del>
            )
          case "code":
            return (
              <code
                key={idx}
                className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground"
              >
                {seg.value}
              </code>
            )
          case "link":
            return (
              <a
                key={idx}
                href={seg.href}
                target={seg.href.startsWith("http") ? "_blank" : undefined}
                rel={seg.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="font-medium text-primary underline underline-offset-4"
              >
                {seg.value}
              </a>
            )
          case "break":
            return <br key={idx} />
          default:
            return null
        }
      })}
    </p>
  )
}

/** 单行内联渲染（不带 <p> 包裹，用于标题旁、tooltip 等场景） */
export function MdxInlineSpan({ text, className }: MdxInlineProps) {
  const segments = parseInline(text)
  if (segments.length === 0) return null
  return (
    <span className={cn(className)}>
      {segments.map((seg, idx) => {
        switch (seg.type) {
          case "text":
            return <Fragment key={idx}>{seg.value}</Fragment>
          case "strong":
            return (
              <strong key={idx} className="font-semibold">
                {seg.value}
              </strong>
            )
          case "code":
            return (
              <code key={idx} className="rounded bg-muted px-1 font-mono text-[0.9em]">
                {seg.value}
              </code>
            )
          case "link":
            return (
              <a key={idx} href={seg.href} className="text-primary underline">
                {seg.value}
              </a>
            )
          case "del":
            return <del key={idx}>{seg.value}</del>
          case "em":
            return <em key={idx}>{seg.value}</em>
          case "break":
            return <br key={idx} />
          default:
            return null
        }
      })}
    </span>
  )
}
