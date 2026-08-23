import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { getPostBySlug } from "@/lib/mdx"
import { PostForm } from "@/components/admin/post-form"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function EditPostPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
    notFound()
  }

  const { slug } = await params
  let post

  try {
    post = await getPostBySlug(slug)
  } catch {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <h2 className="font-display text-xl tracking-tight">编辑文章</h2>
      <PostForm
        mode="edit"
        slug={slug}
        initialTitle={post.title}
        initialDescription={post.description}
        initialContent={post.content}
        initialTags={post.tags}
        initialCoverImage={post.coverImage}
        initialDate={post.date}
      />
    </div>
  )
}
