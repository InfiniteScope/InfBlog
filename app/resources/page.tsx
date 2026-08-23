import { Download } from "lucide-react"

import { auth } from "@/auth"
import { getPublicResources } from "@/lib/resources"
import { ResourceCard } from "@/components/resources/resource-card"
import { ResourceForm } from "@/components/resources/resource-form"

export const metadata = {
  title: "资源分享 | InfBlog",
  description: "分享好用的软件、工具与资源",
}

export default async function ResourcesPage() {
  const [resources, session] = await Promise.all([getPublicResources(), auth()])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-8">
      <section className="space-y-2">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="font-mono text-xs tracking-widest text-accent">
              // RESOURCES
            </p>
            <h1 className="font-display text-4xl tracking-tight">资源分享</h1>
            <p className="text-muted-foreground">
              发现并分享好用的软件与工具
            </p>
          </div>
          <div className="mb-1 shrink-0">
            <ResourceForm />
          </div>
        </div>
      </section>

      {resources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-12 text-center">
          <Download className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">还没有资源分享，快来发布第一个吧</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  )
}
