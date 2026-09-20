"use client"

import { ComponentPropsWithoutRef, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"

import { cn } from "@/lib/utils"

interface CodeBlockProps {
  language?: string
  preProps: ComponentPropsWithoutRef<"pre">
}

/**
 * 代码块外壳：语言徽标 + 一键复制 + 滚动容器。
 * 高亮由构建期 rehype-pretty-code（Shiki）完成，这里只负责装饰与交互；
 * 复制内容直接从 DOM 读取（<pre><code> 的 textContent），不重复携带源码。
 */
export function CodeBlock({ language, preProps }: CodeBlockProps) {
  const { className, children, ...rest } = preProps
  const containerRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    const code = containerRef.current?.querySelector("code")?.textContent ?? ""
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* 剪贴板不可用（非 https / 权限）时静默失败 */
    }
  }

  return (
    <div
      ref={containerRef}
      data-code-block
      className="group my-6 overflow-hidden rounded-lg border border-border bg-muted"
    >
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {language ?? "text"}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "已复制" : "复制代码"}
          title={copied ? "已复制" : "复制代码"}
          className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 transition-colors hover:text-accent"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-accent" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <pre
        {...rest}
        className={cn(
          "overflow-x-auto p-4 font-mono text-sm [tab-size:2] [&_code]:rounded-none [&_code]:bg-transparent [&_code]:p-0",
          className
        )}
      >
        {children}
      </pre>
    </div>
  )
}
