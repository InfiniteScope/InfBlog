import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { FriendLinksManager } from "@/components/admin/friend-links-manager"
import { getFriendLinks } from "@/lib/friends"

export const metadata = {
  title: "友链管理 | InfBlog",
}

export default async function AdminFriendsPage() {
  const session = await auth()
  if (session?.user?.role !== "OWNER") notFound()

  const friends = await getFriendLinks()

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-xl tracking-tight">友链管理</h2>
        <p className="text-sm text-muted-foreground">
          增删改会立即同步到侧边栏与关于页，不需要重新构建或部署。
        </p>
      </div>

      <FriendLinksManager initial={friends} />
    </div>
  )
}
