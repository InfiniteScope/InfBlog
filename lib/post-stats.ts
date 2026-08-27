import { createHash } from "node:crypto"

import { prisma } from "@/lib/prisma"

export interface PostViewStats {
  totalViews: number
  monthViews: number
  likes: number
  favorites: number
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/** 访客指纹：IP + UA 哈希，用于点赞幂等（无需登录） */
export function visitorKeyFrom(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || ""
  const ip = fwd || request.headers.get("x-real-ip") || "unknown"
  const ua = request.headers.get("user-agent") || ""
  return createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 32)
}

/** 浏览 +1（跨月自动清零月计数），返回最新统计 */
export async function trackPostView(slug: string): Promise<PostViewStats> {
  const monthKey = currentMonthKey()
  const stats = await prisma.postStats.upsert({
    where: { slug },
    create: { slug, totalViews: 1, monthKey, monthViews: 1 },
    update: {
      totalViews: { increment: 1 },
      monthViews: { increment: 1 },
    },
  })

  // 跨月：清零月计数（upsert 无法原子处理，读改写一次）
  if (stats.monthKey !== monthKey) {
    const fixed = await prisma.postStats.update({
      where: { slug },
      data: { monthKey, monthViews: 1 },
    })
    return pick(fixed)
  }

  return pick(stats)
}

/** 只读统计（不计数） */
export async function getPostStats(slug: string): Promise<PostViewStats> {
  const stats = await prisma.postStats.findUnique({ where: { slug } })
  return stats ? pick(stats) : { totalViews: 0, monthViews: 0, likes: 0, favorites: 0 }
}

/** 批量统计（列表页用），返回 slug -> stats */
export async function getPostStatsMap(
  slugs: string[]
): Promise<Record<string, PostViewStats>> {
  const empty = { totalViews: 0, monthViews: 0, likes: 0, favorites: 0 }
  if (slugs.length === 0) return {}
  const rows = await prisma.postStats.findMany({ where: { slug: { in: slugs } } })
  const map: Record<string, PostViewStats> = {}
  for (const row of rows) map[row.slug] = pick(row)
  for (const slug of slugs) if (!map[slug]) map[slug] = empty
  return map
}

/** 点赞 / 取消点赞（toggle），返回 { likes, liked } */
export async function likePost(
  slug: string,
  visitorKey: string
): Promise<{ likes: number; liked: boolean }> {
  const existing = await prisma.postLike.findUnique({
    where: { slug_visitorKey: { slug, visitorKey } },
  })

  if (existing) {
    // 已赞 → 取消
    await prisma.$transaction([
      prisma.postLike.delete({ where: { id: existing.id } }),
      prisma.postStats.update({
        where: { slug },
        data: { likes: { decrement: 1 } },
      }),
    ])
    const stats = await getPostStats(slug)
    return { likes: Math.max(0, stats.likes), liked: false }
  }

  // 未赞 → 点赞
  await prisma.$transaction([
    prisma.postLike.create({ data: { slug, visitorKey } }),
    prisma.postStats.upsert({
      where: { slug },
      create: { slug, likes: 1 },
      update: { likes: { increment: 1 } },
    }),
  ])

  const stats = await getPostStats(slug)
  return { likes: stats.likes, liked: true }
}

/** 当前访客是否已点赞 */
export async function hasLiked(
  slug: string,
  visitorKey: string
): Promise<boolean> {
  const row = await prisma.postLike.findUnique({
    where: { slug_visitorKey: { slug, visitorKey } },
  })
  return Boolean(row)
}

/** 收藏 / 取消收藏（登录用户 toggle），同步 post_stats.favorites 计数 */
export async function toggleFavorite(
  slug: string,
  userId: string
): Promise<{ favorited: boolean }> {
  const existing = await prisma.postFavorite.findUnique({
    where: { userId_slug: { userId, slug } },
  })

  if (existing) {
    await prisma.$transaction([
      prisma.postFavorite.delete({ where: { id: existing.id } }),
      prisma.postStats.update({
        where: { slug },
        data: { favorites: { decrement: 1 } },
      }),
    ])
    return { favorited: false }
  }

  await prisma.$transaction([
    prisma.postFavorite.create({ data: { slug, userId } }),
    prisma.postStats.upsert({
      where: { slug },
      create: { slug, favorites: 1 },
      update: { favorites: { increment: 1 } },
    }),
  ])
  return { favorited: true }
}

/** 用户是否收藏过某篇 */
export async function hasFavorited(
  slug: string,
  userId: string
): Promise<boolean> {
  const row = await prisma.postFavorite.findUnique({
    where: { userId_slug: { userId, slug } },
  })
  return Boolean(row)
}

/** 用户收藏列表（新→旧） */
export async function getUserFavorites(userId: string): Promise<
  Array<{ slug: string; favoritedAt: Date }>
> {
  const rows = await prisma.postFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { slug: true, createdAt: true },
  })
  return rows.map((r) => ({ slug: r.slug, favoritedAt: r.createdAt }))
}

function pick(row: {
  totalViews: number
  monthViews: number
  likes: number
  favorites: number
}): PostViewStats {
  return {
    totalViews: row.totalViews,
    monthViews: row.monthViews,
    likes: row.likes,
    favorites: row.favorites,
  }
}
