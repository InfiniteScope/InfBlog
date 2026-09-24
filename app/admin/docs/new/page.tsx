import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { DocForm } from "@/components/admin/doc-form"

export const metadata = {
  title: "新建档案 | InfBlog",
}

export default async function NewDocPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "OWNER") {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <h2 className="font-display text-xl tracking-tight">新建档案</h2>
      <DocForm mode="create" />
    </div>
  )
}
