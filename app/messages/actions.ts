"use server"

import { revalidatePath } from "next/cache"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function markAllRead() {
  const session = await auth()
  if (!session?.user?.id) return
  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  })
  revalidatePath("/messages")
}

/** Used by the navbar badge to fetch the unread count. */
export async function getUnreadCount() {
  const session = await auth()
  if (!session?.user?.id) return 0
  return prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  })
}
