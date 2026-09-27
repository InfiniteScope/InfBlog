import { prisma } from "@/lib/prisma"

export type BookmarkType = "post" | "doc"

export interface BookmarkRecord {
  id: number
  type: BookmarkType
  slug: string
  title: string
  percent: number
  anchor: string | null
  label: string | null
  createdAt: Date
  updatedAt: Date
}

/** 用户全部书签（最近更新在前） */
export async function getUserBookmarks(userId: string) {
  return prisma.bookmark.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  })
}

export async function getUserBookmark(
  userId: string,
  type: BookmarkType,
  slug: string
) {
  return prisma.bookmark.findUnique({
    where: { userId_type_slug: { userId, type, slug } },
  })
}

export interface UpsertBookmarkInput {
  userId: string
  type: BookmarkType
  slug: string
  title: string
  percent: number
  anchor: string | null
  label: string | null
}

/** 保存/更新书签位置（同用户同篇唯一） */
export async function upsertBookmark(input: UpsertBookmarkInput) {
  return prisma.bookmark.upsert({
    where: {
      userId_type_slug: {
        userId: input.userId,
        type: input.type,
        slug: input.slug,
      },
    },
    create: {
      userId: input.userId,
      type: input.type,
      slug: input.slug,
      title: input.title,
      percent: input.percent,
      anchor: input.anchor,
      label: input.label,
    },
    update: {
      title: input.title,
      percent: input.percent,
      anchor: input.anchor,
      label: input.label,
    },
  })
}

export async function deleteBookmark(userId: string, id: number) {
  return prisma.bookmark.deleteMany({ where: { id, userId } })
}
