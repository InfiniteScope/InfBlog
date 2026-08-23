import Link from "next/link"
import { ArrowLeft, Download, FileText, Plus, Rss, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="font-mono text-xs tracking-widest text-accent">
            // ADMIN
          </p>
          <h1 className="font-display text-3xl tracking-tight">博客管理</h1>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回站点
          </Link>
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/posts">
            <FileText className="mr-2 h-4 w-4" />
            文章列表
          </Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/admin/posts/new">
            <Plus className="mr-2 h-4 w-4" />
            新建文章
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/users">
            <Users className="mr-2 h-4 w-4" />
            用户权限
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/updates">
            <Rss className="mr-2 h-4 w-4" />
            动态管理
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/resources">
            <Download className="mr-2 h-4 w-4" />
            资源审核
          </Link>
        </Button>
      </div>

      <Separator />

      {children}
    </div>
  )
}
