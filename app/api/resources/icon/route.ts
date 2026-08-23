import { auth } from "@/auth"
import { resolveFaviconUrl } from "@/lib/favicon"

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
    // Resolve an external icon URL (e.g. https://www.7-zip.org/7ziplogo.png)
    // without downloading it — the origin site serves the bytes.
    const iconUrl = await resolveFaviconUrl(url)
    return jsonResponse({ success: true, url: iconUrl })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "抓取失败，请手动填写图标链接"
    return jsonResponse({ success: false, message }, 400)
  }
}
