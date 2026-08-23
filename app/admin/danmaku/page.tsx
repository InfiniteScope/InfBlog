import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { getDanmakuAll } from "@/app/danmaku/actions"
import { RemoveDanmakuButton } from "@/components/admin/remove-danmaku-button"

export const metadata = {
  title: "弹幕管理 | InfBlog",
}

export default async function AdminDanmakuPage() {
  const session = await auth()

  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
    notFound()
  }

  const danmaku = await getDanmakuAll()

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <h2 className="font-display text-xl tracking-tight">弹幕管理</h2>

      {danmaku.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
          <p className="text-muted-foreground">暂无弹幕</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {danmaku.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/50 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <p className="min-w-0 truncate text-sm text-foreground">
                  {item.content}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleString("zh-CN")}
              </span>
              <RemoveDanmakuButton id={item.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
