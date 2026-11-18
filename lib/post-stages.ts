export type PostStageId = "space-no-eden"

export interface PostStageConfig {
  id: PostStageId
  slug: string
  /** 严格匹配的前端路由（解码态），仅在此路由下激活演出层 */
  route: string
  bgmQuery: string
}

export const SPACE_NO_EDEN_SLUG = "宇宙非伊甸"
export const SPACE_NO_EDEN_ROUTE = `/blog/${SPACE_NO_EDEN_SLUG}`

const STAGE_REGISTRY: Record<string, PostStageConfig> = {
  [SPACE_NO_EDEN_SLUG]: {
    id: "space-no-eden",
    slug: SPACE_NO_EDEN_SLUG,
    route: SPACE_NO_EDEN_ROUTE,
    bgmQuery: "everglow",
  },
}

/**
 * 按解码后的文章 slug 精确解析专属演出配置。
 */
export function resolvePostStage(decodedSlug: string): PostStageConfig | null {
  return STAGE_REGISTRY[decodedSlug] ?? null
}

/**
 * 严格校对当前客户端路由是否精确等于目标文章路由。
 * 同时兼容 URL 编码与已解码形态，并剔除尾随斜杠；不匹配任何子路径或其它页面。
 */
export function isExactStageRoute(pathname: string | null, expectedRoute: string): boolean {
  if (!pathname) return false
  let normalized = pathname.split(/[?#]/)[0]
  try {
    normalized = decodeURIComponent(normalized)
  } catch {
    return false
  }
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1)
  }
  return normalized === expectedRoute
}
