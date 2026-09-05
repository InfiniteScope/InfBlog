import Link from "next/link"
import { RefreshCw, Clock, Image as ImageIcon, Tag, Type, Eye } from "lucide-react"

import { siteConfig } from "@/lib/config"
import { getAllPosts } from "@/lib/mdx"
import { getPostStatsMap } from "@/lib/post-stats"
import { getUpdates } from "@/lib/updates"
import { Button } from "@/components/ui/button"
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
  const latestPosts = posts.slice(0, 10)
  const latestUpdates = updates.slice(0, 5)
  const statsMap = await getPostStatsMap(latestPosts.map((p) => p.slug))

  return (
    <div className="mx-auto max-w-7xl">
      {/* 2 列栅格：
          第 1 行：左=hero(标题+技能)，右=音乐播放器
          第 2 行左：最新文章；第 2 行右：widgets（SITE_VIEWS 紧跟播放器，其后 Updates/Tags/Stats） */}
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_420px]">
        {/* Hero: title left, skill showcase right.
            上/下边缘与音乐播放器（h-56）对齐；标题行 items-start 与 WELCOME 平齐 */}
        <div className="grid items-start gap-6 md:h-[224px] lg:col-start-1 lg:row-start-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <section className="flex flex-col justify-center space-y-4">
            <TypedHeading />
            <h1 className="font-display text-3xl tracking-tight md:text-5xl lg:text-5xl">
              {siteConfig.name}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {siteConfig.description}
            </p>
          </section>

          {/* GitHub projects + tech stack showcase */}
          <SkillShowcase />
        </div>

        {/* Latest Posts（第2行左列） */}
        <section className="space-y-4 lg:col-start-1 lg:row-start-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-tight">最新文章</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/blog">查看全部</Link>
            </Button>
          </div>
          {latestPosts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
              <p className="text-muted-foreground">博客文章即将上线</p>
            </div>
          ) : (
            <StaggerContainer className="grid gap-4">
              {latestPosts.map((post) => (
                <StaggerItem key={post.slug}>
                  <article className="group overflow-hidden rounded-xl border border-border bg-card/50 transition-colors hover:bg-card">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="flex flex-col sm:flex-row-reverse"
                    >
                      {post.coverImage && (
                        <div className="relative aspect-video w-full shrink-0 overflow-hidden sm:aspect-square sm:w-40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col justify-center space-y-3 p-5">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <RefreshCw className="h-3.5 w-3.5" />
                            {new Date(post.updatedAt ?? post.date).toLocaleDateString("zh-CN")}
                          </span>
                          <span
                            className="flex items-center gap-1"
                            title="总浏览量 / 本月浏览量"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {statsMap[post.slug]?.totalViews ?? 0} /{" "}
                            {statsMap[post.slug]?.monthViews ?? 0}
                          </span>
                          {post.tags.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3.5 w-3.5" />
                              {post.tags.join(", ")}
                            </span>
                          )}
                        </div>
                        <h3 className="font-display text-xl tracking-tight transition-colors group-hover:text-primary">
                          {post.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1">
                            <Type className="h-3 w-3" />
                            {post.wordCount?.toLocaleString("zh-CN") ?? 0} 字
                          </span>
                          <span className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1">
                            <ImageIcon className="h-3 w-3" />
                            {post.imageCount ?? 0} 图
                          </span>
                          <span className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1">
                            <Clock className="h-3 w-3" />
                            {post.readingTime ?? "1 分钟"}
                          </span>
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
        <div className="flex flex-col gap-8 lg:col-start-2 lg:row-start-1 lg:row-span-2">
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
