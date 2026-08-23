import { prisma } from "@/lib/prisma"
import { isCollectibleId, type CollectibleId } from "@/lib/collectibles"

/**
 * 幂等授予藏品。返回是否为新获得。
 */
export async function grantCollectible(
  userId: string,
  itemId: CollectibleId | string
): Promise<boolean> {
  if (!isCollectibleId(itemId)) return false

  const existing = await prisma.userCollectible.findUnique({
    where: { userId_itemId: { userId, itemId } },
    select: { id: true },
  })
  if (existing) return false

  await prisma.userCollectible.create({
    data: { userId, itemId },
  })
  return true
}
