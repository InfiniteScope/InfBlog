import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, Boxes, Plus } from "lucide-react"

import { auth } from "@/auth"
import {
  getAllResourceTags,
  getMyResources,
} from "@/lib/resources"
import { Button } from "@/components/ui/button"
import { ResourceForm } from "@/components/resources/resource-form"
import { DeleteResourceButton } from "@/components/resources/delete-resource-button"

export const metadata = {
  title: "资源管理 | InfBlog",
}

const STATUS_LABEL: Record<string, string> = {
  APPROVED: "已上线",
  PENDING: "审核中",
  REJECTED: "未通过",
}

export default async function MyResourcesPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fresources%2Fmine")
  }

  const [resources, allTags] = await Promise.all([
    getMyResources(session.user.id),
    getAllResourceTags(),
  ])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href="/resources">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回资源分享
          </Link>
        </Button>
        <div className="ml-auto">
          <ResourceForm allTags={allTags} />
        </div>
      </div>

      <section className="space-y-2">
        <p className="font-mono text-xs tracking-widest text-accent">
          // MY_RESOURCES
        </p>
        <h1 className="font-display text-3xl tracking-tight">资源管理</h1>
        <p className="text-sm text-muted-foreground">
          在这里查看并编辑你分享过的全部资源（{resources.length}）
        </p>
      </section>

      {resources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-12 text-center">
          <Boxes className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">你还没有分享过资源</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/resources">
              <Plus className="mr-1.5 h-4 w-4" />
              去分享一个
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  {resource.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resource.icon}
                      alt={resource.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Boxes className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate font-medium"
                    title={resource.name}
                  >
                    <Link
                      href={`/resources/${resource.id}`}
                      className="transition-colors hover:text-primary"
                    >
                      {resource.name}
                    </Link>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span
                      className={
                        resource.status === "APPROVED"
                          ? "rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent"
                          : "rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      }
                    >
                      {STATUS_LABEL[resource.status]}
                    </span>
                    {resource.tags.slice(0, 3).map((t) => (
                      <span
                        key={t.tag.name}
                        className="rounded bg-muted px-1.5 py-0.5 text-[10px]"
                      >
                        #{t.tag.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <ResourceForm
                    mode="edit"
                    resourceId={resource.id}
                    initialName={resource.name}
                    initialSummary={resource.summary}
                    initialDescription={resource.description}
                    initialIcon={resource.icon ?? ""}
                    initialHomepageUrl={resource.homepageUrl ?? ""}
                    initialDownloadUrl={resource.downloadUrl}
                    initialTags={resource.tags.map((t) => t.tag.name)}
                    allTags={allTags}
                  />
                  <DeleteResourceButton resourceId={resource.id} />
                </div>
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {resource.summary || resource.description}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(resource.createdAt).toLocaleString("zh-CN")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
