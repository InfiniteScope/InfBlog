import { notFound } from "next/navigation"
import { headers } from "next/headers"
import {
  Calendar,
  Tag,
  ArrowLeft,
  Pencil,
  RefreshCw,
} from "lucide-react"
import { MDXRemote } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { rehypeStyleObject } from "@/lib/rehype-style-object"

import { auth } from "@/auth"
import { getPostBySlug, getPostSlugs } from "@/lib/mdx"
import {
  getPostStats,
  hasLiked,
  hasFavorited,
  visitorKeyFromHeaders,
} from "@/lib/post-stats"
import { mdxComponents } from "@/components/mdx-components"
import { Button } from "@/components/ui/button"
import { RemovePostButton } from "@/components/admin/remove-post-button"
import { ReadingTracker } from "@/components/collectibles/reading-tracker"
import { PostActionsFloat } from "@/components/blog/post-actions-float"
import { PostViewTracker } from "@/components/blog/post-view-tracker"
import { PostStatBadges } from "@/components/blog/post-stat-badges"
import Link from "next/link"

interface PageProps {
  params: Promise<{ slug: string }>
}

export const dynamicParams = true
export const revalidate = 60

export async function generateStaticParams() {
  const slugs = await getPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  try {
    const post = await getPostBySlug(slug)
    return {
      title: `${post.title} | InfBlog`,
      description: post.description,
    }
  } catch {
    return {
      title: "文章未找到 | InfBlog",
    }
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  let post

  try {
    post = await getPostBySlug(slug)
  } catch {
    notFound()
  }

  const session = await auth()
  const canManage = session?.user?.role === "OWNER"
  const stats = await getPostStats(slug)

  // SSR 阶段算好“是否已赞/已收藏”：与客户端 API 同源（相同指纹逻辑），
  // 首帧即为真实状态，避免浮动按钮挂载后状态跳变闪烁
  const headersList = await headers()
  const visitorKey = visitorKeyFromHeaders(headersList)
  const [initialLiked, initialFavorited] = await Promise.all([
    hasLiked(slug, visitorKey),
    session?.user ? hasFavorited(slug, session.user.id) : Promise.resolve(false),
  ])

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-8">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" className="w-fit gap-1" asChild>
          <Link href="/blog">
            <ArrowLeft className="h-4 w-4" />
            返回博客
          </Link>
        </Button>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/posts/${slug}`}>
                <Pencil className="mr-1 h-4 w-4" />
                编辑
              </Link>
            </Button>
            <RemovePostButton slug={slug} redirectTo="/blog" />
          </div>
        )}
      </div>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(post.date).toLocaleDateString("zh-CN")}
          </span>
          {post.updatedAt && post.updatedAt !== post.date && (
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              更新于 {new Date(post.updatedAt).toLocaleDateString("zh-CN")}
            </span>
          )}
          {post.tags.length > 0 && (
            <span className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              {post.tags.join(", ")}
            </span>
          )}
          <span className="ml-auto flex items-center gap-4">
            <PostStatBadges slug={slug} initial={stats} />
          </span>
        </div>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          {post.title}
        </h1>
        <p className="text-lg text-muted-foreground">{post.description}</p>
        {post.coverImage && (
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImage}
              alt={post.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </header>

      <div className="max-w-none">
        <MDXRemote
          source={post.content}
          components={mdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm, remarkMath],
              rehypePlugins: [rehypeKatex, rehypeStyleObject],
            },
          }}
        />
      </div>

      <ReadingTracker />
      <PostViewTracker slug={slug} />
      <PostActionsFloat
        slug={slug}
        initialLikes={stats.likes}
        initialFavorites={stats.favorites}
        initialLiked={initialLiked}
        initialFavorited={initialFavorited}
      />
    </article>
  )
}
