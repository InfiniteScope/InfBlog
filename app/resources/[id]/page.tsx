import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Calendar, Download, Globe, Pin, User } from "lucide-react"
import ReactMarkdown from "react-markdown"

import { auth } from "@/auth"
import { getResourceById } from "@/lib/resources"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ResourceForm } from "@/components/resources/resource-form"
import { DeleteResourceButton } from "@/components/resources/delete-resource-button"

export const metadata = {
  title: "资源详情 | InfBlog",
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [resource, session] = await Promise.all([getResourceById(id), auth()])

  if (!resource || resource.status !== "APPROVED") {
    notFound()
  }

  const user = session?.user
  const canEdit =
    user?.id === resource.authorId ||
    user?.role === "OWNER" ||
    user?.role === "ADMIN"

  const authorLabel = resource.author?.nickname || resource.author?.name || "匿名"

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-8">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link href="/resources">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回资源列表
        </Link>
      </Button>

      <div className="rounded-xl border border-border bg-card/50 p-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
            {resource.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resource.icon}
                alt={resource.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Download className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl tracking-tight">
                {resource.name}
              </h1>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <ResourceForm
                    mode="edit"
                    resourceId={resource.id}
                    initialName={resource.name}
                    initialSummary={resource.summary}
                    initialDescription={resource.description}
                    initialIcon={resource.icon ?? ""}
                    initialHomepageUrl={resource.homepageUrl ?? ""}
                    initialDownloadUrl={resource.downloadUrl}
                  />
                  <DeleteResourceButton resourceId={resource.id} />
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={resource.author?.image || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {authorLabel.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                {authorLabel}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(resource.createdAt).toLocaleString("zh-CN")}
              </span>
              {resource.isOwnerPost && (
                <span className="flex items-center gap-1 text-accent">
                  <Pin className="h-3.5 w-3.5" />
                  {resource.author?.role === "ADMIN" ? "管理员推荐" : "站长推荐"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {resource.homepageUrl && (
            <Button asChild>
              <a href={resource.homepageUrl} target="_blank" rel="noopener noreferrer">
                <Globe className="mr-2 h-4 w-4" />
                官网主页
              </a>
            </Button>
          )}
          <Button asChild variant="default">
            <a
              href={resource.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Download className="mr-2 h-4 w-4" />
              立即下载
            </a>
          </Button>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            资源简介
          </p>
          <div className="space-y-3 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc">
            <ReactMarkdown>{resource.description}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}
