import Link from "next/link"
import { CalendarDays, Newspaper, Plus } from "lucide-react"
import ReactMarkdown from "react-markdown"

import { auth } from "@/auth"
import { getUpdates } from "@/lib/updates"
import { getLatestDigest } from "@/lib/digest"
import { Button } from "@/components/ui/button"
import { DigestView } from "@/components/digest/digest-view"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "动态 | InfBlog",
  description: "网站最近的更新与想法，以及最新的科技资讯快报",
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function UpdatesPage({ searchParams }: PageProps) {
  const { tab } = await searchParams
  const activeTab = tab === "tech" ? "tech" : "site"

  const [updates, session] = await Promise.all([getUpdates(), auth()])
  const digest = activeTab === "tech" ? await getLatestDigest() : null

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="font-mono text-xs tracking-widest text-accent">
              // UPDATES
            </p>
            <h1 className="font-display text-4xl tracking-tight">动态</h1>
            <p className="text-muted-foreground">
              网站最近的更新与想法，以及最新的科技资讯
            </p>
          </div>
          {activeTab === "site" && session?.user?.role === "OWNER" && (
            <Button asChild>
              <Link href="/admin/updates/new">
                <Plus className="mr-2 h-4 w-4" />
                创建动态
              </Link>
            </Button>
          )}
        </div>

        {/* 分栏切换：网站动态 / 科技动态 */}
        <div className="flex items-center gap-2">
          <Link
            href="/updates"
            className={cn(
              "v2-tag transition-colors",
              activeTab === "site" && "!border-accent/40 !text-accent"
            )}
          >
            网站动态
          </Link>
          <Link
            href="/updates?tab=tech"
            className={cn(
              "v2-tag transition-colors",
              activeTab === "tech" && "!border-accent/40 !text-accent"
            )}
          >
            <Newspaper className="h-3 w-3" />
            科技动态
          </Link>
        </div>
      </section>

      {activeTab === "tech" ? (
        <DigestTab digest={digest} />
      ) : updates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
          <p className="text-muted-foreground">暂无动态</p>
        </div>
      ) : (
        <SiteTimeline updates={updates} />
      )}
    </div>
  )
}

function SiteTimeline({
  updates,
}: {
  updates: Awaited<ReturnType<typeof getUpdates>>
}) {
  return (
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
  )
}

function DigestTab({
  digest,
}: {
  digest: Awaited<ReturnType<typeof getLatestDigest>>
}) {
  if (!digest) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
        <Newspaper className="mx-auto mb-3 h-6 w-6 text-muted-foreground/50" />
        <p className="text-muted-foreground">快报服务暂时不可用，稍后再来看看</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DigestView digest={digest} />
      <Link
        href="/digest"
        className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-accent"
      >
        // 查看历史快报
      </Link>
    </div>
  )
}
