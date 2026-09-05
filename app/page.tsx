import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { siteConfig } from "@/lib/config"
import { cn } from "@/lib/utils"
import { getAllPosts } from "@/lib/mdx"
import { getPostStatsMap } from "@/lib/post-stats"
import { getUpdates } from "@/lib/updates"
import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/ui/section-heading"
import { Reveal } from "@/components/motion/reveal"
import { MusicPlayerExpanded } from "@/components/music/music-player-expanded"
import { DataStrip } from "@/components/home/data-strip"
import { UpdatesStrip } from "@/components/home/updates-strip"
import { TagsFlow } from "@/components/home/tags-flow"
import { GithubProjects } from "@/components/home/github-projects"
import { TechMarquee } from "@/components/home/tech-marquee"
import { TypedHeading } from "@/components/motion/typed-heading"

const TECH_STACK = [
  "Next.js",
  "App Router",
  "React 19",
  "TypeScript",
  "Vue 3 / Vite",
  "FastAPI",
  "SpringBoot",
  "Tailwind CSS",
  "SQLite",
  "MySQL",
  "JAVA",
  "Python",
  "Three.js",
  "Motion",
  "PostgreSQL",
]

/** 文章行的不规律缩进节奏（px 单位来自 Tailwind scale），打破直线惯性 */
const ROW_INDENTS = ["lg:pl-0", "lg:pl-20", "lg:pl-8", "lg:pl-28", "lg:pl-12"]

/**
 * 首页「FAR SIDE / 月之暗面」：线性信息流，任务语言命名。
 * 00 门户（月盘+播放器）→ marquee 纹理带 → 01 信号（文章）→ 02 遥测
 * → 03 任务日志（横向）→ 04 探测器 → 05 频段 → END OF TRANSMISSION。
 */
export default async function HomePage() {
  const [posts, updates] = await Promise.all([getAllPosts(), getUpdates()])
  const [featured, ...rest] = posts
  const latestPosts = rest.slice(0, 5)
  const latestUpdates = updates.slice(0, 5)
  const statsMap = await getPostStatsMap(
    [featured, ...latestPosts].filter(Boolean).map((p) => p.slug)
  )

  const tagCounts = new Map<string, number>()
  for (const post of posts) {
    for (const tag of post.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }
  const tags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1])

  return (
    <div className="relative mx-auto max-w-6xl pb-8">
      {/* 竖排诗行：贴内容区左缘，仅在超宽屏落笔 */}
      <p
        className="v2-only absolute -left-12 top-[34vh] hidden font-mono text-[10px] tracking-[0.5em] text-muted-foreground/50 min-[1500px]:block"
        style={{ writingMode: "vertical-rl" }}
      >
        向月之暗面致意 · TO THE FAR SIDE
      </p>

      {/* 00 // 门户：月之暗面 */}
      <div className="relative isolate flex min-h-[60vh] flex-col justify-center overflow-hidden py-12 lg:min-h-[min(74vh,52rem)]">
        {/* 月盘：晨昏线 180s 一周，暗色下背景网格化作星野 */}
        <div className="v2-only v2-moon" aria-hidden />
        <span className="v2-only v2-cross left-0 top-2" aria-hidden>
          +
        </span>
        <span className="v2-only v2-cross bottom-2 right-0" aria-hidden>
          +
        </span>

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1fr_420px]">
          <section className="space-y-5">
            <TypedHeading />
            <h1 className="font-display text-7xl tracking-tight md:text-8xl lg:text-9xl">
              {siteConfig.name}
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              INF = INFINITE · 求索 · 探索 · 致意遥不可及
            </p>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {siteConfig.description}
            </p>
          </section>
          <div className="relative z-10">
            <SectionHeading className="mb-3">// EARTH_RADIO</SectionHeading>
            <MusicPlayerExpanded />
          </div>
        </div>
      </div>

      {/* 斜向 TECH marquee：全宽纹理分隔带（恒动，与全页静止对比） */}
      <Reveal
        variant="wipe"
        className="marquee-fade-x relative h-32 overflow-hidden md:h-40"
      >
        <TechMarquee items={TECH_STACK} />
      </Reveal>

      {/* 01 // 信号 TRANSMISSIONS：FEATURED 编辑卡 + 幽灵序号发丝行 */}
      <section className="py-14 lg:py-20">
        <Reveal>
          <div className="flex items-end justify-between pb-8">
            <div className="space-y-2">
              <SectionHeading index="01">// TRANSMISSIONS</SectionHeading>
              <h2 className="font-display text-3xl tracking-tight md:text-4xl">
                最新文章
              </h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/blog">查看全部</Link>
            </Button>
          </div>
        </Reveal>

        {posts.length === 0 ? (
          <div className="v2-card border-dashed p-8 text-center">
            <p className="text-muted-foreground">博客文章即将上线</p>
          </div>
        ) : (
          <div className="v2-list">
            {featured && (
              <Reveal>
                <article className="group v2-row">
                  <Link
                    href={`/blog/${featured.slug}`}
                    className={cn(
                      "grid gap-8 py-10",
                      featured.coverImage &&
                        "md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-center"
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                        <span className="text-accent">FEATURED</span>
                        <span aria-hidden className="text-border">
                          /
                        </span>
                        <span>
                          {new Date(
                            featured.updatedAt ?? featured.date
                          ).toLocaleDateString("zh-CN")}
                        </span>
                        <span aria-hidden className="text-border">
                          /
                        </span>
                        <span title="总浏览量 / 本月浏览量">
                          浏览{" "}
                          {(
                            statsMap[featured.slug]?.totalViews ?? 0
                          ).toLocaleString("zh-CN")}
                          {" / "}
                          {(
                            statsMap[featured.slug]?.monthViews ?? 0
                          ).toLocaleString("zh-CN")}
                        </span>
                        {featured.tags.length > 0 && (
                          <>
                            <span aria-hidden className="text-border">
                              /
                            </span>
                            <span>{featured.tags.join(" · ")}</span>
                          </>
                        )}
                      </div>
                      <h3 className="font-display text-4xl tracking-tight transition-colors group-hover:text-accent md:text-5xl">
                        {featured.title}
                      </h3>
                      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground line-clamp-3 md:text-base">
                        {featured.description}
                      </p>
                      <div className="font-mono text-[10px] tracking-wide text-muted-foreground/70">
                        {(featured.wordCount ?? 0).toLocaleString("zh-CN")} 字
                        {" / "}
                        {featured.imageCount ?? 0} 图
                        {" / "}
                        {featured.readingTime ?? "1 分钟"}
                      </div>
                    </div>
                    {featured.coverImage && (
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={featured.coverImage}
                          alt={featured.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                  </Link>
                </article>
              </Reveal>
            )}

            {latestPosts.map((post, i) => (
              <Reveal key={post.slug} delay={Math.min(i * 0.06, 0.3)}>
                <article className="group v2-row">
                  <Link
                    href={`/blog/${post.slug}`}
                    className={cn(
                      "flex items-center gap-5 py-5 sm:gap-8",
                      ROW_INDENTS[i % ROW_INDENTS.length]
                    )}
                  >
                    <span className="v2-ghost-num w-12 shrink-0 text-right sm:w-16">
                      {String(i + 2).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                        <span>
                          {new Date(post.updatedAt ?? post.date).toLocaleDateString(
                            "zh-CN"
                          )}
                        </span>
                        <span aria-hidden className="text-border">
                          /
                        </span>
                        <span title="总浏览量 / 本月浏览量">
                          浏览{" "}
                          {(
                            statsMap[post.slug]?.totalViews ?? 0
                          ).toLocaleString("zh-CN")}
                          {" / "}
                          {(
                            statsMap[post.slug]?.monthViews ?? 0
                          ).toLocaleString("zh-CN")}
                        </span>
                        {post.tags.length > 0 && (
                          <>
                            <span aria-hidden className="text-border">
                              /
                            </span>
                            <span>{post.tags.join(" · ")}</span>
                          </>
                        )}
                      </div>
                      <h3 className="font-display text-xl tracking-tight transition-colors group-hover:text-accent">
                        {post.title}
                      </h3>
                      <div className="font-mono text-[10px] tracking-wide text-muted-foreground/70">
                        {(post.wordCount ?? 0).toLocaleString("zh-CN")} 字
                        {" / "}
                        {post.imageCount ?? 0} 图
                        {" / "}
                        {post.readingTime ?? "1 分钟"}
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* 02 // 遥测 TELEMETRY：全宽数据仪表带 */}
      <section className="space-y-8 py-14 lg:py-20">
        <Reveal>
          <div className="space-y-2">
            <SectionHeading index="02">// TELEMETRY</SectionHeading>
            <h2 className="font-display text-3xl tracking-tight md:text-4xl">
              遥测
            </h2>
          </div>
        </Reveal>
        <Reveal variant="wipe">
          <DataStrip posts={posts} updates={updates} />
        </Reveal>
      </section>

      {/* 03 // 任务日志 MISSION_LOG：横向滚动带 */}
      <section className="space-y-8 py-14 lg:py-20">
        <Reveal>
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <SectionHeading index="03">// MISSION_LOG</SectionHeading>
              <h2 className="font-display text-3xl tracking-tight md:text-4xl">
                任务日志
              </h2>
            </div>
            <span className="v2-only font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
              Scroll →
            </span>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <UpdatesStrip updates={latestUpdates} />
        </Reveal>
      </section>

      {/* 04 // 探测器 PROBES：GitHub 项目紧凑行 */}
      <section className="space-y-8 py-14 lg:py-20">
        <Reveal>
          <div className="space-y-2">
            <SectionHeading index="04">// PROBES</SectionHeading>
            <h2 className="font-display text-3xl tracking-tight md:text-4xl">
              探测器
            </h2>
          </div>
        </Reveal>
        <Reveal delay={0.06}>
          <GithubProjects />
        </Reveal>
      </section>

      {/* 05 // 频段 FREQUENCIES：标签流，不规则延迟飘落 */}
      <section className="space-y-8 py-14 lg:py-20">
        <Reveal>
          <div className="space-y-2">
            <SectionHeading index="05">// FREQUENCIES</SectionHeading>
            <h2 className="font-display text-3xl tracking-tight md:text-4xl">
              频段
            </h2>
          </div>
        </Reveal>
        <TagsFlow tags={tags} />
      </section>

      {/* 收束行 */}
      <p className="v2-only pt-8 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
        —— END OF TRANSMISSION · 我们在月之暗面见 ——
      </p>
    </div>
  )
}
