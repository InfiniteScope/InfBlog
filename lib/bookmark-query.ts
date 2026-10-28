import type { BookmarkType } from "@/lib/bookmarks"

export interface BookmarkSnapshot {
  percent: number
  anchor: string | null
  label: string | null
}

/**
 * 书签状态共享查询。
 *
 * 同一篇文章上 `BookmarkButton` 和 `ReadingResume` 都要查一次
 * `/api/bookmarks?type=&slug=`，之前是两个独立请求。这里做一层
 * 「in-flight 去重 + 15s 短缓存」：同一时刻只发一个请求，短时间内
 * 重新挂载也不重复打服务端。
 *
 * 保存/删除书签后必须调用 invalidate（否则 15s 内会读到旧值）。
 */
const TTL_MS = 15_000

const cache = new Map<string, { at: number; value: Promise<BookmarkSnapshot | null> }>()

function keyOf(type: BookmarkType, slug: string) {
  return `${type}:${slug}`
}

export function getBookmarkState(
  type: BookmarkType,
  slug: string
): Promise<BookmarkSnapshot | null> {
  const key = keyOf(type, slug)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value

  const value: Promise<BookmarkSnapshot | null> = fetch(
    `/api/bookmarks?type=${type}&slug=${encodeURIComponent(slug)}`
  )
    .then(async (res) => {
      if (!res.ok) {
        cache.delete(key)
        return null
      }
      const data = (await res.json().catch(() => null)) as {
        bookmark?: BookmarkSnapshot | null
      } | null
      return data?.bookmark ?? null
    })
    .catch(() => {
      cache.delete(key)
      return null
    })

  cache.set(key, { at: Date.now(), value })
  return value
}

export function invalidateBookmarkState(type: BookmarkType, slug: string) {
  cache.delete(keyOf(type, slug))
}

export function invalidateAllBookmarkStates() {
  cache.clear()
}
