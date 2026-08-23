import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, Pencil, Trash2 } from "lucide-react"

import { auth } from "@/auth"
import { getAllPosts } from "@/lib/mdx"
import { Button } from "@/components/ui/button"
import { RemovePostButton } from "@/components/admin/remove-post-button"

export const metadata = {
  title: "文章管理 | InfBlog",
}

export default async function AdminPostsPage() {
  const session = await auth()
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
    notFound()
  }

  const posts = await getAllPosts()

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
          <p className="text-muted-foreground">暂无文章</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {posts.map((post) => (
            <div
              key={post.slug}
              className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-4"
            >
              <div className="min-w-0 space-y-1">
                <h3 className="font-display text-lg tracking-tight truncate">
                  {post.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(post.date).toLocaleDateString("zh-CN")}
                  </span>
                  <span className="truncate">/{post.slug}</span>
                </div>
              </div>
              <div className="ml-4 flex shrink-0 gap-2">
                <Button variant="outline" size="icon" asChild>
                  <Link href={`/admin/posts/${post.slug}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <RemovePostButton slug={post.slug} redirectTo="/admin/posts" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
