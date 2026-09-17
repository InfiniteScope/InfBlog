import Link from "next/link"
import { ArrowRight, Newspaper, Rss } from "lucide-react"

import { getDigestList, getLatestDigest } from "@/lib/digest"
import { DigestView } from "@/components/digest/digest-view"
import { SectionHeading } from "@/components/ui/section-heading"

export const metadata = {
  title: "科技资讯快报 | InfBlog",
  description:
    "由 glance-of-tech 每 12 小时自动抓取 HackerNews、arXiv 等来源并生成摘要",
  alternates: {
    types: {
      "application/rss+xml": [
        { title: "科技资讯日报", url: "/digest/feed.xml" },
        { title: "InfBlog 博客", url: "/feed.xml" },
      ],
    },
  },
}

export const revalidate = 300

export default async function DigestPage() {
  const [latest, archive] = await Promise.all([
    getLatestDigest(),
    getDigestList(30),
  ])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 py-8">
      <section className="space-y-2">
        <p className="font-mono text-xs tracking-widest text-accent">
          // DAILY_GLANCE
        </p>
        <h1 className="font-display text-4xl tracking-tight">科技资讯快报</h1>
        <p className="text-muted-foreground">
          每 12 小时自动抓取 HackerNews、arXiv 等科技来源，由 LLM 生成摘要 ·
          Powered by{" "}
          <span className="font-mono text-xs">glance-of-tech</span>
        </p>
        <Link
          href="/digest/feed.xml"
          target="_blank"
          className="v2-tag w-fit transition-colors hover:text-accent"
          title="订阅科技资讯日报（每日 08:15 推送：前一日晚报 + 今日早报）"
        >
          <Rss className="h-3 w-3" />
          RSS 订阅日报
        </Link>
      </section>

      {latest ? (
        <DigestView digest={latest} />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
          <Newspaper className="mx-auto mb-3 h-6 w-6 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            快报服务暂时不可用，稍后再来看看
          </p>
        </div>
      )}

      {archive.length > 0 && (
        <section className="v2-panel space-y-4">
          <SectionHeading index="02">// ARCHIVE</SectionHeading>
          <ul className="divide-y divide-border/40">
            {archive.map((entry) => {
              const isLatest =
                latest &&
                entry.date === latest.date &&
                entry.period === latest.period
              return (
                <li key={`${entry.date}-${entry.period}`}>
                  <Link
                    href={`/digest/${entry.date}/${entry.period}`}
                    className="group flex items-center gap-3 py-3 transition-colors"
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {entry.date}
                    </span>
                    <span className="v2-tag !py-0.5">
                      {entry.period === "morning" ? "早报" : "晚报"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground/80 transition-colors group-hover:text-accent">
                      {entry.title}
                    </span>
                    {isLatest && (
                      <span className="font-mono text-[10px] tracking-widest text-accent">
                        LATEST
                      </span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
