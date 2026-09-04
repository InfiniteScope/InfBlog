import { auth } from "@/auth"
import { fetchSiteMeta } from "@/lib/web-meta"

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonResponse({ success: false, message: "请先登录" }, 401)
  }

  let url: string | undefined
  try {
    const body = (await request.json()) as { url?: string }
    url = body.url
  } catch {
    return jsonResponse({ success: false, message: "请求体格式不正确" }, 400)
  }

  if (!url || !/^https?:\/\//.test(url)) {
    return jsonResponse({ success: false, message: "请填写完整的官网链接" }, 400)
  }

  try {
    const meta = await fetchSiteMeta(url)
    if (!meta.icon && !meta.title) {
      return jsonResponse({ success: false, message: "未能从该网站抓取到有效信息" }, 400)
    }
    return jsonResponse({ success: true, ...meta })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "抓取失败，请稍后重试"
    return jsonResponse({ success: false, message }, 400)
  }
}
