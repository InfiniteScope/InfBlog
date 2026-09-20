import type { Post } from "@/lib/mdx"
import type { PostViewStats } from "@/lib/post-stats"

export const SORT_METRICS = [
  "updatedAt",
  "publishedAt",
  "totalViews",
  "monthViews",
  "likes",
  "favorites",
  "words",
] as const

export type SortMetric = (typeof SORT_METRICS)[number]

/**
 * 正序（normal，默认）：沿用博客默认展示顺序 —— 时间「新→旧」、数量「多→少」
 *（即指标值降序）；逆序（reverse）：反转（时间「旧→新」、数量「少→多」）。
 */
export const SORT_ORDERS = ["normal", "reverse"] as const
export type SortOrder = (typeof SORT_ORDERS)[number]

export const DEFAULT_SORT: SortMetric = "updatedAt"
export const DEFAULT_ORDER: SortOrder = "normal"

export function parseSortMetric(value?: string): SortMetric {
  return SORT_METRICS.includes(value as SortMetric)
    ? (value as SortMetric)
    : DEFAULT_SORT
}

export function parseSortOrder(value?: string): SortOrder {
  return SORT_ORDERS.includes(value as SortOrder)
    ? (value as SortOrder)
    : DEFAULT_ORDER
}

function metricValue(
  post: Post,
  stats: PostViewStats | undefined,
  metric: SortMetric
): number {
  switch (metric) {
    case "updatedAt":
      return new Date(post.updatedAt ?? post.date).getTime()
    case "publishedAt":
      return new Date(post.date).getTime()
    case "totalViews":
      return stats?.totalViews ?? 0
    case "monthViews":
      return stats?.monthViews ?? 0
    case "likes":
      return stats?.likes ?? 0
    case "favorites":
      return stats?.favorites ?? 0
    case "words":
      return post.wordCount ?? 0
  }
}

export function sortPosts(
  posts: Post[],
  statsMap: Record<string, PostViewStats>,
  metric: SortMetric,
  order: SortOrder
): Post[] {
  const sorted = [...posts].sort(
    (a, b) =>
      metricValue(b, statsMap[b.slug], metric) -
      metricValue(a, statsMap[a.slug], metric)
  )
  return order === "reverse" ? sorted.reverse() : sorted
}
