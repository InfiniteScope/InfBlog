import { prisma } from "@/lib/prisma"

export const RESOURCE_ACTION_VIEWS = {
  resources: true,
  createdAt: true,
} as const

const authorSelect = { nickname: true, name: true, image: true, role: true } as const
const tagsSelect = { tag: { select: { name: true } } } as const

interface PublicListFilters {
  q?: string
  tag?: string
}

/** Get public resources: owner posts first, then others; optional keyword/tag filter. */
export async function getPublicResources(filters?: PublicListFilters) {
  const where: Record<string, unknown> = { status: "APPROVED" }

  const q = filters?.q?.trim()
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { summary: { contains: q } },
      { description: { contains: q } },
      { homepageUrl: { contains: q } },
    ]
  }
  const tag = filters?.tag?.trim()
  if (tag) {
    where.tags = { some: { tag: { name: tag } } }
  }

  return prisma.resource.findMany({
    where,
    orderBy: [{ isOwnerPost: "desc" }, { createdAt: "asc" }],
    include: {
      author: { select: authorSelect },
      tags: { select: tagsSelect },
    },
  })
}

export async function getResourceById(id: string) {
  return prisma.resource.findUnique({
    where: { id },
    include: {
      author: { select: authorSelect },
      tags: { select: tagsSelect },
    },
  })
}

export async function getPendingResources() {
  return prisma.resource.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: authorSelect },
      tags: { select: tagsSelect },
    },
  })
}

/** 当前用户分享过的所有资源（含 PENDING/REJECTED） */
export async function getMyResources(userId: string) {
  return prisma.resource.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: authorSelect },
      tags: { select: tagsSelect },
    },
  })
}

/** 全部已存在的标签（供选择/筛选） */
export async function getAllResourceTags(): Promise<string[]> {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: { name: true },
  })
  return tags.map((t) => t.name)
}

/** 资源详情页评论（新→旧） */
export async function getResourceComments(resourceId: string) {
  return prisma.resourceComment.findMany({
    where: { resourceId },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { nickname: true, name: true, image: true } },
    },
  })
}
