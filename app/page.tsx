import Link from "next/link"

import { siteConfig } from "@/lib/config"
import { getAllPosts } from "@/lib/mdx"
import { getPostStatsMap } from "@/lib/post-stats"
import { getUpdates } from "@/lib/updates"
import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/ui/section-heading"
import { MusicPlayerExpanded } from "@/components/music/music-player-expanded"
import { TimelineWidget } from "@/components/updates/timeline-widget"
import { TagsWidget } from "@/components/home/tags-widget"
import { StatsWidget } from "@/components/home/stats-widget"
import { ViewsCard } from "@/components/home/views-card"
import { SkillShowcase } from "@/components/home/skill-showcase"
import {
  StaggerContainer,
  StaggerItem,
} from "@/components/motion/stagger-container"
import { TypedHeading } from "@/components/motion/typed-heading"

export default async function HomePage() {
  const [posts, updates] = await Promise.all([getAllPosts(), getUpdates()])
  const latestPosts = posts.slice(0, 6)
  const latestUpdates = updates.slice(0, 5)
  const statsMap = await getPostStatsMap(latestPosts.map((p) => p.slug))

  return (
    <div className="mx-auto max-w-7xl">
      {/* 2 列栅格：
          第 1 行：左=hero(标题+技能)，右=音乐播放器
          第 2 行左：最新文章（发丝线分行）；第 2 行右：widgets（编号 02-05） */}
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_420px] lg:gap-12">
        {/* Hero: title left, skill showcase right.
            上/下边缘与音乐播放器（h-56）对齐 */}
        <div className="relative grid items-center gap-6 md:h-[224px] lg:col-start-1 lg:row-start-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* 蓝图十字角标（仅 v2 显示） */}
          <span className="v2-only v2-cross -left-4 -top-4" aria-hidden>
            +
          </span>
          <span className="v2-only v2-cross -bottom-4 -right-4" aria-hidden>
            +
          </span>
          <section className="flex flex-col justify-center space-y-3">
            <TypedHeading />
            <h1 className="font-display text-5xl tracking-tight md:text-6xl lg:text-7xl">
              {siteConfig.name}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {siteConfig.description}
            </p>
          </section>

          {/* GitHub projects + tech stack showcase */}
          <SkillShowcase />
        </div>

        {/* Latest Posts（第2行左列）：发丝线分行列表 */}
        <section className="lg:col-start-1 lg:row-start-2">
          <div className="flex items-end justify-between pb-5">
            <div className="space-y-2">
              <SectionHeading index="01">// LATEST_ARTICLES</SectionHeading>
              <h2 className="font-display text-2xl tracking-tight md:text-3xl">
                最新文章
              </h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/blog">查看全部</Link>
            </Button>
          </div>
          {latestPosts.length === 0 ? (
            <div className="v2-card border-dashed p-8 text-center">
              <p className="text-muted-foreground">博客文章即将上线</p>
            </div>
          ) : (
            <StaggerContainer className="v2-list">
              {latestPosts.map((post) => (
                <StaggerItem key={post.slug}>
                  <article className="group v2-row py-6">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="flex flex-col gap-4 sm:flex-row-reverse sm:items-center sm:gap-8"
                    >
                      {post.coverImage && (
                        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-md sm:aspect-square sm:w-36">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col justify-center space-y-2.5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                          <span>
                            {new Date(post.updatedAt ?? post.date).toLocaleDateString("zh-CN")}
                          </span>
                          <span aria-hidden className="text-border">
                            /
                          </span>
                          <span title="总浏览量 / 本月浏览量">
                            浏览{" "}
                            {(statsMap[post.slug]?.totalViews ?? 0).toLocaleString("zh-CN")}
                            {" / "}
                            {(statsMap[post.slug]?.monthViews ?? 0).toLocaleString("zh-CN")}
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
                        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                          {post.description}
                        </p>
                        <div className="font-mono text-[10px] tracking-wide text-muted-foreground/70">
                          {(post.wordCount ?? 0).toLocaleString("zh-CN")} 字
                          {" / "}
                          {post.imageCount ?? 0} 图
                          {" / "}
                          {post.readingTime ?? "1 分钟"}
                        </div>
                      </div>
                    </Link>
                  </article>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </section>

        {/* Right column: music player + widgets packed（第1行右→第2行右连续） */}
        <div className="flex flex-col gap-10 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <MusicPlayerExpanded />
          <ViewsCard />
          <TimelineWidget updates={latestUpdates} />
          <TagsWidget posts={posts} />
          <StatsWidget posts={posts} updates={updates} />
        </div>
      </div>
    </div>
  )
}
