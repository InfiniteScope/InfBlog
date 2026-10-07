import Link from "next/link"
import { BookMarked, Eye, Plus } from "lucide-react"

import { auth } from "@/auth"
import { getAllDocs } from "@/lib/docs"
import { getPostStatsMap } from "@/lib/post-stats"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/motion/reveal"
import { PostDates } from "@/components/blog/post-dates"
import { CoverImage } from "@/components/ui/cover-image"
import { MdxInline } from "@/components/ui/mdx-inline"

export const metadata = {
  title: "文库 | InfBlog",
  description: "长篇图文资料库 · 各类系统性的学习资料与文档",
}

export const revalidate = 60

export default async function DocsPage() {
  const [docs, session] = await Promise.all([getAllDocs(), auth()])
  const isOwner = session?.user?.role === "OWNER"

  const totalWords = docs.reduce((sum, doc) => sum + (doc.wordCount ?? 0), 0)
  const totalImages = docs.reduce((sum, doc) => sum + (doc.imageCount ?? 0), 0)
  // 阅读量（post_stats.type = 'doc'，与文章计数互不干扰）
  const statsMap = await getPostStatsMap(docs.map((d) => d.slug), "doc")

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-8">
      <section className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-widest text-accent">
            // LIBRARY
          </p>
          <h1 className="font-display text-4xl tracking-tight">文库</h1>
          <p className="text-muted-foreground">
            长篇图文资料库 · 系统性的学习资料与文档收纳
          </p>
        </div>
        {isOwner && (
          <Button asChild>
            <Link href="/admin/docs/new">
              <Plus className="mr-2 h-4 w-4" />
              新建档案
            </Link>
          </Button>
        )}
      </section>

      {/* 统计横条 */}
      <section className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-muted-foreground">
        <span>
          <BookMarked className="mr-1 inline h-3.5 w-3.5" />
          {docs.length} 份档案
        </span>
        <span className="text-border" aria-hidden>
          /
        </span>
        <span>{totalWords.toLocaleString("zh-CN")} 字</span>
        <span className="text-border" aria-hidden>
          /
        </span>
        <span>{totalImages} 图</span>
      </section>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
          <p className="text-muted-foreground">文库暂未收录档案</p>
        </div>
      ) : (
        <section className="grid gap-5 md:grid-cols-2">
          {docs.map((doc, i) => (
            <Reveal key={doc.slug} delay={Math.min(i * 0.06, 0.3)}>
              <Link href={`/docs/${doc.slug}`} className="group block h-full">
                <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card/50 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-card hover:shadow-lg hover:shadow-accent/5">
                  {doc.coverImage && (
                    <CoverImage
                      src={doc.coverImage}
                      alt={doc.title}
                      containerClassName="aspect-video w-full overflow-hidden"
                      imgClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                      <PostDates
                        date={doc.date}
                        updatedAt={doc.updatedAt}
                        iconClassName="h-3 w-3"
                      />
                      {doc.tags.length > 0 && (
                        <>
                          <span aria-hidden className="text-border">
                            /
                          </span>
                          <span className="flex flex-wrap items-center gap-1.5">
                            {doc.tags.map((t) => (
                              <span
                                key={t}
                                className="rounded-full border border-border/60 px-2 py-px text-[10px] tracking-wide"
                              >
                                {t}
                              </span>
                            ))}
                          </span>
                        </>
                      )}
                    </div>
                    <h2 className="font-display text-xl tracking-tight transition-colors group-hover:text-accent">
                      {doc.title}
                    </h2>
                    <MdxInline
                      text={doc.description}
                      className="flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-2"
                    />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] tracking-wide text-muted-foreground">
                      <span
                        className="flex items-center gap-1"
                        title="阅读量（总 / 本月）"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {(statsMap[doc.slug]?.totalViews ?? 0).toLocaleString("zh-CN")}
                        {" / "}
                        {(statsMap[doc.slug]?.monthViews ?? 0).toLocaleString("zh-CN")}
                      </span>
                      <span aria-hidden>/</span>
                      <span>{(doc.wordCount ?? 0).toLocaleString("zh-CN")} 字</span>
                      <span aria-hidden>/</span>
                      <span>{doc.imageCount ?? 0} 图</span>
                      <span aria-hidden>/</span>
                      <span>{doc.readingTime ?? "1 分钟"}</span>
                    </div>
                  </div>
                </article>
              </Link>
            </Reveal>
          ))}
        </section>
      )}
    </div>
  )
}
