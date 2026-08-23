import Link from "next/link"
import { Calendar, Clock, Image as ImageIcon, Tag, Type } from "lucide-react"

import { siteConfig } from "@/lib/config"
import { getAllPosts } from "@/lib/mdx"
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

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_420px]">
        {/* Left column: hero + site views */}
        <div className="flex flex-col gap-8">
          {/* Hero: title left, skill showcase right.
              上/下边缘与音乐播放器（h-56）对齐；标题行 items-start 与 WELCOME 平齐 */}
          <div className="grid h-[224px] items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <section className="flex flex-col justify-center space-y-4">
              <TypedHeading />
              <h1 className="font-display text-4xl tracking-tight md:text-5xl lg:text-5xl">
                {siteConfig.name}
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                {siteConfig.description}
              </p>
            </section>

            {/* GitHub projects + tech stack showcase */}
            <SkillShowcase />
          </div>

          {/* Site views */}
          <ViewsCard />
        </div>

        {/* Music Player（h-56 外壳与 hero 等高，上下沿对齐） */}
        <MusicPlayerExpanded />

        {/* Latest Posts */}
        <section className="space-y-4">
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
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(post.date).toLocaleDateString("zh-CN")}
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

        {/* Right sidebar widgets */}
        <aside className="flex flex-col gap-8">
          <TimelineWidget updates={updates} />
          <TagsWidget posts={posts} />
          <StatsWidget posts={posts} updates={updates} />
        </aside>
      </div>
    </div>
  )
}
