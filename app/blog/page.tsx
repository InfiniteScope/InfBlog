import Link from "next/link"
import { Calendar, Clock, Image as ImageIcon, Tag, Type } from "lucide-react"

import { getAllPosts } from "@/lib/mdx"

export const metadata = {
  title: "博客 | InfBlog",
  description: "技术、设计与生活的文章集合",
}

export const revalidate = 60

export default async function BlogPage() {
  const posts = await getAllPosts()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-8">
      <section className="space-y-2">
        <p className="font-mono text-xs tracking-widest text-accent">// BLOG</p>
        <h1 className="font-display text-4xl tracking-tight">博客</h1>
        <p className="text-muted-foreground">
          技术、设计与生活的文章集合
        </p>
      </section>

      <section className="grid gap-4">
        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
            <p className="text-muted-foreground">暂无文章</p>
          </div>
        ) : (
          posts.map((post) => (
            <article
              key={post.slug}
              className="group overflow-hidden rounded-xl border border-border bg-card/50 transition-colors hover:bg-card"
            >
              <Link href={`/blog/${post.slug}`} className="block">
                {post.coverImage && (
                  <div className="aspect-video w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="space-y-3 p-5">
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
                  <h2 className="font-display text-xl tracking-tight transition-colors group-hover:text-primary">
                    {post.title}
                  </h2>
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
          ))
        )}
      </section>
    </div>
  )
}
