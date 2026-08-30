"use client"

import Link from "next/link"
import { Download, Pin } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { ResourceWithAuthor } from "@/lib/resources-types"

export function ResourceCard({ resource }: { resource: ResourceWithAuthor }) {
  const authorLabel = resource.author?.nickname || resource.author?.name || "匿名"

  return (
    <Link
      href={`/resources/${resource.id}`}
      className="group flex flex-col gap-4 rounded-xl border border-border bg-card/50 p-4 transition-colors hover:border-accent/40 hover:bg-card"
    >
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
          {resource.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resource.icon}
              alt={resource.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Download className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg tracking-tight group-hover:text-primary">
            {resource.name}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {resource.summary || resource.description}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <Avatar className="h-5 w-5">
          <AvatarImage src={resource.author?.image || undefined} />
          <AvatarFallback className="text-[10px]">
            {authorLabel.slice(0, 1)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate">{authorLabel}</span>
        {resource.isOwnerPost && (
          <span className="flex shrink-0 items-center gap-0.5 text-accent">
            <Pin className="h-3 w-3" />
            {resource.author?.role === "ADMIN" ? "管理员推荐" : "站长推荐"}
          </span>
        )}
        <span className="ml-auto shrink-0 text-[10px]">
          {new Date(resource.createdAt).toLocaleDateString("zh-CN")}
        </span>
      </div>
    </Link>
  )
}
