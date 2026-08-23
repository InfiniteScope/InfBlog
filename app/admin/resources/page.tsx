import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { Download, Globe, Inbox } from "lucide-react"

import { auth } from "@/auth"
import { getPendingResources } from "@/lib/resources"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ReviewResourceButtons } from "@/components/admin/review-resource-buttons"

export const metadata = {
  title: "资源审核 | InfBlog",
}

export default async function AdminResourcesPage() {
  const session = await auth()
  if (session?.user?.role !== "OWNER" && session?.user?.role !== "ADMIN") {
    notFound()
  }

  const resources = await getPendingResources()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-tight">资源审核</h2>
        <p className="text-sm text-muted-foreground">
          审核访客提交的资源分享请求（{resources.length}）
        </p>
      </div>

      {resources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center">
          <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">暂无待审核的资源</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {resources.map((resource) => {
            const authorLabel =
              resource.author?.nickname || resource.author?.name || "匿名"
            return (
              <div
                key={resource.id}
                className="rounded-xl border border-border bg-card/50 p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                    {resource.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resource.icon}
                        alt={resource.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Download className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-medium">{resource.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      提交人：{authorLabel} ·{" "}
                      {new Date(resource.createdAt).toLocaleString("zh-CN")}
                    </p>
                    <div className="text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_p]:leading-relaxed">
                      <ReactMarkdown>{resource.description}</ReactMarkdown>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {resource.homepageUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={resource.homepageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Globe className="mr-1.5 h-3.5 w-3.5" />
                            官网
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={resource.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          下载链接
                        </a>
                      </Button>
                    </div>
                  </div>
                  <ReviewResourceButtons resourceId={resource.id} />
                </div>
                <Separator className="mt-3" />
                <p className="mt-2 px-14 md:px-16 text-[10px] text-muted-foreground">
                  通过后资源将公开显示；拒绝后提交者会收到通知。
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
