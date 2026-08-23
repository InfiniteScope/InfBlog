import Link from "next/link"
import { notFound } from "next/navigation"
import {
  BookMarked,
  Download,
  FileText,
  MessageSquare,
  Rss,
  Users,
} from "lucide-react"

import { auth } from "@/auth"

export const metadata = {
  title: "管理 | InfBlog",
}

const adminItems = [
  {
    href: "/admin/danmaku",
    title: "弹幕管理",
    description: "查看并删除全站弹幕",
    icon: MessageSquare,
  },
  {
    href: "/admin/posts",
    title: "文章管理",
    description: "新建、编辑与删除博客文章",
    icon: FileText,
  },
  {
    href: "/admin/updates",
    title: "动态管理",
    description: "发布、编辑与删除站点动态",
    icon: Rss,
  },
  {
    href: "/admin/resources",
    title: "资源审核",
    description: "审核用户分享的资源",
    icon: Download,
  },
  {
    href: "/admin/users",
    title: "用户管理",
    description: "管理用户权限与昵称",
    icon: Users,
  },
  {
    href: "/admin/collectibles",
    title: "藏品图鉴",
    description: "查看全部藏品 3D 模型",
    icon: BookMarked,
  },
]

export default async function AdminPage() {
  const session = await auth()

  if (
    !session?.user ||
    (session.user.role !== "OWNER" && session.user.role !== "ADMIN")
  ) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-1">
        <h2 className="font-display text-2xl tracking-tight">管理后台</h2>
        <p className="text-sm text-muted-foreground">
          选择要管理的模块
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {adminItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-5 transition-colors hover:border-accent hover:bg-accent/5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg tracking-tight group-hover:text-accent">
                {item.title}
            </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
