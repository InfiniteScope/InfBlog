import { AlertTriangle, ExternalLink, Sunrise, Sunset } from "lucide-react"

import type { Digest } from "@/lib/digest"
import { SectionHeading } from "@/components/ui/section-heading"

/**
 * 快报正文渲染：v2 编辑风 —— 期次徽标 + 总览引文块 +
 * 按来源分组（SectionHeading）+ 全局 mono 编号条目行。
 */
export function DigestView({ digest }: { digest: Digest }) {
  const isMorning = digest.period === "morning"
  const generatedAt = new Date(digest.generatedAt)
  const groups = groupBySource(digest)

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="v2-tag !text-accent !border-accent/40">
            {isMorning ? (
              <Sunrise className="h-3 w-3" />
            ) : (
              <Sunset className="h-3 w-3" />
            )}
            {isMorning ? "早报" : "晚报"}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {digest.date} · 生成于{" "}
            {generatedAt.toLocaleString("zh-CN", { hour12: false })}
          </span>
          {digest.degraded && (
            <span
              className="v2-tag"
              title="LLM 摘要生成失败，本期为纯清单模式"
            >
              <AlertTriangle className="h-3 w-3" />
              RAW_FEED
            </span>
          )}
        </div>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          {digest.title}
        </h1>
        {digest.summary && (
          <blockquote className="border-l-2 border-accent/40 pl-4 leading-relaxed text-muted-foreground">
            {digest.summary}
          </blockquote>
        )}
      </header>

      {groups.map(([source, items, offset]) => (
        <section key={source} className="v2-panel space-y-4">
          <SectionHeading>// {source.toUpperCase()}</SectionHeading>
          <ol className="space-y-4">
            {items.map((item, i) => {
              const index = offset + i + 1
              return (
                <li
                  key={`${item.url}-${index}`}
                  className="flex gap-3 border-b border-border/40 pb-4 last:border-0 last:pb-0"
                >
                  <span className="w-6 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground/50">
                    {String(index).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline font-medium leading-snug transition-colors hover:text-accent"
                    >
                      {item.title}
                      <ExternalLink className="mb-0.5 ml-1 inline h-3 w-3 opacity-40 transition-opacity group-hover:opacity-100" />
                    </a>
                    {item.summary && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {item.summary}
                      </p>
                    )}
                    {(item.tags.length > 0 || item.publishedAt) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {item.tags.map((tag) => (
                          <span key={tag} className="v2-tag !py-0.5">
                            {tag}
                          </span>
                        ))}
                        {item.publishedAt && (
                          <span className="font-mono text-[11px] text-muted-foreground/50">
                            {new Date(item.publishedAt).toLocaleDateString(
                              "zh-CN",
                              { month: "numeric", day: "numeric" }
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="hidden h-14 w-24 shrink-0 self-start rounded-md border border-border object-cover sm:block"
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </article>
  )
}

/** 按来源分组（保持条目原有顺序），返回 [来源, 条目, 全局起始序号] */
function groupBySource(
  digest: Digest
): [source: string, items: Digest["items"], offset: number][] {
  const order: string[] = []
  const bySource = new Map<string, Digest["items"]>()
  for (const item of digest.items) {
    if (!bySource.has(item.source)) {
      bySource.set(item.source, [])
      order.push(item.source)
    }
    bySource.get(item.source)!.push(item)
  }
  let offset = 0
  return order.map((source) => {
    const items = bySource.get(source)!
    const group: [string, Digest["items"], number] = [source, items, offset]
    offset += items.length
    return group
  })
}
