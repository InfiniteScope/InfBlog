import { prisma } from "@/lib/prisma"

export const RESOURCE_ACTION_VIEWS = {
  resources: true,
  createdAt: true,
} as const

/** Get public resources: owner posts first, then others by createdAt asc (earlier first). */
export async function getPublicResources() {
  const resources = await prisma.resource.findMany({
    where: { status: "APPROVED" },
    orderBy: [{ isOwnerPost: "desc" }, { createdAt: "asc" }],
    include: {
      author: { select: { nickname: true, name: true, image: true } },
    },
  })
  return resources
}

export async function getResourceById(id: string) {
  return prisma.resource.findUnique({
    where: { id },
    include: {
      author: { select: { nickname: true, name: true, image: true } },
    },
  })
}

export async function getPendingResources() {
  return prisma.resource.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { nickname: true, name: true, image: true } },
    },
  })
}
