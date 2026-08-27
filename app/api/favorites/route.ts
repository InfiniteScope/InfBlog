import { auth } from "@/auth"
import { getUserFavorites } from "@/lib/post-stats"
import { getPostBySlug, getPostSlugs } from "@/lib/mdx"

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return jsonResponse({ favorites: [] }, 200)
  }

  const favs = await getUserFavorites(session.user.id)
  const slugs = new Set(await getPostSlugs())

  // 文章可能已删除：跳过失效 slug；标题/时间取自 MDX frontmatter
  const favorites = (
    await Promise.all(
      favs.map(async (f) => {
        if (!slugs.has(f.slug)) return null
        try {
          const post = await getPostBySlug(f.slug)
          return {
            slug: f.slug,
            title: post.title,
            updatedAt: post.updatedAt ?? post.date,
            favoritedAt: f.favoritedAt,
          }
        } catch {
          return null
        }
      })
    )
  ).filter(Boolean)

  return jsonResponse({ favorites })
}
