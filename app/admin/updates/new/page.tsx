import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { UpdateForm } from "@/components/admin/update-form"

export const metadata = {
  title: "新建动态 | InfBlog",
}

export default async function NewUpdatePage() {
  const session = await auth()

  if (session?.user?.role !== "OWNER") {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-tight">新建动态</h2>
        <p className="text-sm text-muted-foreground">撰写一条新的站点动态</p>
      </div>
      <UpdateForm mode="create" />
    </div>
  )
}
