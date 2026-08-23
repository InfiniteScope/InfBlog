import { redirect } from "next/navigation"
import { Bell, CheckCircle2, MailCheck, XCircle } from "lucide-react"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { markAllRead } from "@/app/messages/actions"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "消息 | InfBlog",
}

const typeStyles: Record<string, { icon: typeof Bell; className: string; label: string }> = {
  RESOURCE_SUBMITTED: {
    icon: Bell,
    className: "text-accent bg-accent/10",
    label: "资源提交",
  },
  RESOURCE_APPROVED: {
    icon: CheckCircle2,
    className: "text-emerald-500 bg-emerald-500/10",
    label: "审核通过",
  },
  RESOURCE_REJECTED: {
    icon: XCircle,
    className: "text-destructive bg-destructive/10",
    label: "审核拒绝",
  },
}

export default async function MessagesPage() {
  const session = await auth()
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/messages")}`)
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-8">
      <section className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-widest text-accent">
            // MESSAGES
          </p>
          <h1 className="font-display text-4xl tracking-tight">消息</h1>
          <p className="text-muted-foreground">接收站点通知</p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <form action={markAllRead}>
            <Button variant="outline" size="sm" type="submit">
              <MailCheck className="mr-2 h-4 w-4" />
              全部已读
            </Button>
          </form>
        )}
      </section>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center">
          <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">暂无消息</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const style = typeStyles[notification.type] ?? {
              icon: Bell,
              className: "text-muted-foreground bg-muted",
              label: "通知",
            }
            const Icon = style.icon
            return (
              <div
                key={notification.id}
                className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                  notification.isRead
                    ? "border-border bg-card/40"
                    : "border-accent/40 bg-card/60"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.className}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {style.label}
                    {!notification.isRead && (
                      <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />
                    )}
                  </p>
                  <p className="text-sm leading-relaxed">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
