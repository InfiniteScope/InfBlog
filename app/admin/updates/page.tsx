import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarDays, Edit, Plus } from "lucide-react"

import { auth } from "@/auth"
import { getUpdates } from "@/lib/updates"
import { Button } from "@/components/ui/button"
import { RemoveUpdateButton } from "@/components/admin/remove-update-button"

export const metadata = {
  title: "动态管理 | InfBlog",
}

export default async function UpdatesAdminPage() {
  const session = await auth()

  if (session?.user?.role !== "OWNER") {
    notFound()
  }

  const updates = await getUpdates()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl tracking-tight">动态管理</h2>
          <p className="text-sm text-muted-foreground">发布、编辑或删除站点动态</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/admin/updates/new">
            <Plus className="mr-2 h-4 w-4" />
            新建动态
          </Link>
        </Button>
      </div>

      {updates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
          <p className="text-muted-foreground">暂无动态</p>
          <Button className="mt-4" size="sm" asChild>
            <Link href="/admin/updates/new">发布第一条动态</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {updates.map((update) => (
            <div
              key={update.slug}
              className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card/50 p-4 transition-colors hover:border-accent/40 hover:bg-card"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(update.date).toLocaleString("zh-CN")}
                </div>
                {update.title ? (
                  <h3 className="font-medium">{update.title}</h3>
                ) : null}
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {update.content}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="icon" asChild>
                  <Link href={`/admin/updates/${encodeURIComponent(update.slug)}`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
                <RemoveUpdateButton slug={update.slug} redirectTo="/admin/updates" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
