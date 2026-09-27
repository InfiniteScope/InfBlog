import { z } from "zod"

import { auth } from "@/auth"
import {
  deleteBookmark,
  getUserBookmark,
  getUserBookmarks,
  upsertBookmark,
} from "@/lib/bookmarks"

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

const upsertSchema = z.object({
  type: z.enum(["post", "doc"]),
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  percent: z.number().min(0).max(1),
  anchor: z.string().max(200).nullable().optional(),
  label: z.string().max(200).nullable().optional(),
})

/** GET /api/bookmarks → 全部书签；?type=&slug= → 单篇书签状态 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return jsonResponse({ bookmarks: [], bookmark: null })
  }

  const url = new URL(request.url)
  const type = url.searchParams.get("type")
  const slug = url.searchParams.get("slug")

  if (type && slug) {
    const bookmark = await getUserBookmark(session.user.id, type as "post" | "doc", slug)
    return jsonResponse({ bookmark })
  }

  const bookmarks = await getUserBookmarks(session.user.id)
  return jsonResponse({ bookmarks })
}

/** POST /api/bookmarks → 保存/更新书签位置 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return jsonResponse({ message: "请先登录" }, 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ message: "请求格式错误" }, 400)
  }

  const validated = upsertSchema.safeParse(body)
  if (!validated.success) {
    return jsonResponse({ message: "参数不合法" }, 400)
  }

  const bookmark = await upsertBookmark({
    userId: session.user.id,
    type: validated.data.type,
    slug: validated.data.slug,
    title: validated.data.title,
    percent: validated.data.percent,
    anchor: validated.data.anchor ?? null,
    label: validated.data.label ?? null,
  })
  return jsonResponse({ bookmark })
}

/** DELETE /api/bookmarks → 按 id 删除自己的书签 */
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return jsonResponse({ message: "请先登录" }, 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ message: "请求格式错误" }, 400)
  }

  const id = Number((body as { id?: unknown })?.id)
  if (!Number.isInteger(id) || id <= 0) {
    return jsonResponse({ message: "参数不合法" }, 400)
  }

  const result = await deleteBookmark(session.user.id, id)
  return jsonResponse({ success: result.count > 0 })
}
