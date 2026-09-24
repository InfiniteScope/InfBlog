import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, Pencil, Plus } from "lucide-react"

import { auth } from "@/auth"
import { getAllDocs } from "@/lib/docs"
import { Button } from "@/components/ui/button"
import { RemoveDocButton } from "@/components/admin/remove-doc-button"

export const metadata = {
  title: "档案管理 | InfBlog",
}

export default async function AdminDocsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "OWNER") {
    notFound()
  }

  const docs = await getAllDocs()

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs tracking-widest text-muted-foreground">
          // DOCS（{docs.length} 份档案）
        </p>
        <Button size="sm" asChild>
          <Link href="/admin/docs/new">
            <Plus className="mr-2 h-4 w-4" />
            新建档案
          </Link>
        </Button>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
          <p className="text-muted-foreground">暂无档案</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {docs.map((doc) => (
            <div
              key={doc.slug}
              className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-4"
            >
              <div className="min-w-0 space-y-1">
                <h3 className="font-display text-lg tracking-tight truncate">
                  {doc.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(doc.date).toLocaleDateString("zh-CN")}
                  </span>
                  <span className="truncate">/{doc.slug}</span>
                  <span>{(doc.wordCount ?? 0).toLocaleString("zh-CN")} 字</span>
                </div>
              </div>
              <div className="ml-4 flex shrink-0 gap-2">
                <Button variant="outline" size="icon" asChild>
                  <Link href={`/admin/docs/${doc.slug}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <RemoveDocButton slug={doc.slug} redirectTo="/admin/docs" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
