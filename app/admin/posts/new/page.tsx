import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { PostForm } from "@/components/admin/post-form"

export const metadata = {
  title: "新建文章 | InfBlog",
}

export default async function NewPostPage() {
  const session = await auth()
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <h2 className="font-display text-xl tracking-tight">新建文章</h2>
      <PostForm mode="create" />
    </div>
  )
}
