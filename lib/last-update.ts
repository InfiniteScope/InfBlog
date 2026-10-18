import type { Doc } from "@/lib/docs"
import type { Post } from "@/lib/mdx"
import type { Update } from "@/lib/updates"

interface LatestContentSources {
  posts?: Post[]
  docs?: Doc[]
  updates?: Update[]
}

/**
 * 站点「最后更新」时间 = 动态 / 博客 / 文库 三者中最新的一次内容变动。
 *
 * 注意不能只看数组第一个：动态按 date 排序、文章/档案默认按更新时间排序，
 * 但三种内容各自最新的一条未必是全局最新的那一条（例如刚更新了旧文章）。
 * 博客与文库同时比较 date 与 updatedAt（updatedAt 可能缺失，也可能早于 date）。
 *
 * @returns 最新时间的 ISO 字符串；三类内容都为空时返回 null
 */
export function getLatestContentDate({
  posts = [],
  docs = [],
  updates = [],
}: LatestContentSources): string | null {
  let latest = Number.NEGATIVE_INFINITY

  const track = (value?: string) => {
    if (!value) return
    const time = new Date(value).getTime()
    if (Number.isNaN(time)) return
    if (time > latest) latest = time
  }

  for (const update of updates) track(update.date)

  for (const post of posts) {
    track(post.date)
    track(post.updatedAt)
  }

  for (const doc of docs) {
    track(doc.date)
    track(doc.updatedAt)
  }

  if (!Number.isFinite(latest)) return null
  return new Date(latest).toISOString()
}
