import { prisma } from "@/lib/prisma"

export interface FriendLinkItem {
  id: number
  name: string
  url: string
  note: string | null
  sortOrder: number
}

/**
 * 友链（数据库驱动，后台可增删改）。
 * 侧边栏与关于页每次请求实时读取，改完立即生效，不需要重新构建。
 */
export async function getFriendLinks(): Promise<FriendLinkItem[]> {
  return prisma.friendLink.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, name: true, url: true, note: true, sortOrder: true },
  })
}
