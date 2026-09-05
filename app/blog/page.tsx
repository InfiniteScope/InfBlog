import Link from "next/link"

import { getAllPosts } from "@/lib/mdx"
import { getPostStatsMap } from "@/lib/post-stats"

export const metadata = {
  title: "博客 | InfBlog",
  description: "技术、设计与生活的文章集合",
}

export const revalidate = 60

export default async function BlogPage() {
  const posts = await getAllPosts()
  const statsMap = await getPostStatsMap(posts.map((p) => p.slug))

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-4 md:gap-8 md:py-8">
      <section className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          // BLOG
        </p>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">博客</h1>
        <p className="text-muted-foreground">
          技术、设计与生活的文章集合
        </p>
      </section>

      <section className="v2-list">
        {posts.length === 0 ? (
          <div className="v2-card border-dashed p-8 text-center">
            <p className="text-muted-foreground">暂无文章</p>
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.slug} className="group v2-row py-6">
              <Link
                href={`/blog/${post.slug}`}
                className="flex flex-col gap-4 sm:flex-row-reverse sm:items-center sm:gap-8"
              >
                {post.coverImage && (
                  <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-md sm:aspect-[4/3] sm:w-44">
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
                  <h2 className="font-display text-xl tracking-tight transition-colors group-hover:text-accent">
                    {post.title}
                  </h2>
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
          ))
        )}
      </section>
    </div>
  )
}
