import Link from "next/link"
import { CalendarDays, Plus } from "lucide-react"
import ReactMarkdown from "react-markdown"

import { auth } from "@/auth"
import { getUpdates } from "@/lib/updates"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "动态 | InfBlog",
  description: "记录最近的更新与想法",
}

export default async function UpdatesPage() {
  const [updates, session] = await Promise.all([getUpdates(), auth()])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-8">
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="font-mono text-xs tracking-widest text-accent">
              // UPDATES
            </p>
            <h1 className="font-display text-4xl tracking-tight">动态</h1>
            <p className="text-muted-foreground">记录最近的更新与想法</p>
          </div>
          {session?.user?.role === "OWNER" && (
            <Button asChild>
              <Link href="/admin/updates/new">
                <Plus className="mr-2 h-4 w-4" />
                创建动态
              </Link>
            </Button>
          )}
        </div>
      </section>

      {updates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
          <p className="text-muted-foreground">暂无动态</p>
        </div>
      ) : (
        <section className="relative space-y-8 pl-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%_-_16px)] before:w-px before:bg-border">
          {updates.map((update) => (
            <div key={update.slug} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-accent" />
              <div className="space-y-2">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(update.date).toLocaleDateString("zh-CN")}
                </span>
                {update.title && (
                  <h2 className="font-display text-lg tracking-tight">
                    {update.title}
                  </h2>
                )}
                <div className="space-y-3 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:border-accent/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_h3]:font-display [&_h3]:text-base [&_h3]:tracking-tight [&_ol]:ml-5 [&_ol]:list-decimal [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_ul]:ml-5 [&_ul]:list-disc">
                  <ReactMarkdown>{update.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
