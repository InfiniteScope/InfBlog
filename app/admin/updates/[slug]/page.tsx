import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { getUpdateBySlug } from "@/lib/updates"
import { UpdateForm } from "@/components/admin/update-form"

export const metadata = {
  title: "编辑动态 | InfBlog",
}

export default async function EditUpdatePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const session = await auth()

  if (session?.user?.role !== "OWNER") {
    notFound()
  }

  const { slug } = await params
  const update = await getUpdateBySlug(slug)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-tight">编辑动态</h2>
        <p className="text-sm text-muted-foreground">修改并保存这条动态</p>
      </div>
      <UpdateForm
        mode="edit"
        slug={update.slug}
        initialTitle={update.title}
        initialContent={update.content}
        initialDate={update.date}
      />
    </div>
  )
}
