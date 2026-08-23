import { MessageSquare } from "lucide-react"

import { auth } from "@/auth"
import { getGuestbookMessages } from "@/app/guestbook/actions"
import { GuestbookForm } from "@/app/guestbook/guestbook-form"
import { MessageCard } from "@/components/guestbook/message-card"

export const metadata = {
  title: "留言墙 | InfBlog",
  description: "留下你的想法与建议",
}

function getRotation(seed: number) {
  return ((seed * 17) % 10) - 5
}

export default async function GuestbookPage() {
  const [messages, session] = await Promise.all([
    getGuestbookMessages(),
    auth(),
  ])

  const currentUser = session?.user
    ? { id: session.user.id, role: session.user.role }
    : undefined

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-28 pt-8">
      <section className="space-y-2">
        <p className="font-mono text-xs tracking-widest text-accent">
          // GUESTBOOK
        </p>
        <h1 className="font-display text-4xl tracking-tight">留言墙</h1>
        <p className="text-muted-foreground">留下你的想法与建议</p>
      </section>

      <section>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/30 py-16 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              暂时没有留言内容哦...
            </p>
            <p className="text-sm text-muted-foreground">
              在下方输入框写下第一条留言吧！
            </p>
          </div>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {messages.map((message) => (
              <div key={message.id} className="mb-4">
                <MessageCard
                  message={message}
                  rotation={getRotation(message.id)}
                  currentUser={currentUser}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <GuestbookForm />
    </div>
  )
}
