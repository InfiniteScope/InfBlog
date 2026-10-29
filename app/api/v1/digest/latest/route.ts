import { NextResponse } from "next/server"

import { getLatestDigest } from "@/lib/digest"

/**
 * 公开只读接口：最近一期科技快报（macOS 小组件用）。
 *
 * 设计约束（改动前先读）：
 * - **只读**：这里不触发抓取、不调用 LLM、不碰管理接口，只转发 glance-of-tech
 *   已经生成好的 `/latest`。
 * - **不加登录**：任何鉴权都会让原生 App 拿到登录页 HTML。
 * - **不能设 `dynamic = "force-static"`，也不能设 `force-dynamic`**：
 *   前者会把内容烤死在构建里；后者会把路由内所有 fetch 变成 no-store，
 *   让 `lib/digest.ts` 里的 `revalidate: 300` 失效（每来一个请求就打一次 Java 后端）。
 *   保持默认（动态路由 + fetch 5 分钟缓存）即可。
 * - 失败一律返回 **JSON 503**（含 `Cache-Control: no-store`），不能是 HTML 错误页；
 *   否则小组件会拿到 HTML，且 503 被缓存后会一直报错。
 * - 响应字段与 `Digest` 接口一致：`tags` 是字符串数组、时间是 ISO-8601，
 *   不要额外包一层 `{ code, data }`。
 */

const JSON_UTF8 = "application/json; charset=utf-8"
const CACHE_OK =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
const UNAVAILABLE = {
  error: "digest_unavailable",
  message: "暂时无法获取简报",
}

function unavailable() {
  return NextResponse.json(UNAVAILABLE, {
    status: 503,
    headers: {
      "Content-Type": JSON_UTF8,
      // 错误绝不能缓存：否则小组件会一直拿到 503
      "Cache-Control": "no-store",
    },
  })
}

export async function GET() {
  try {
    const digest = await getLatestDigest()
    if (!digest) return unavailable()

    return NextResponse.json(digest, {
      status: 200,
      headers: {
        // 显式带上 charset，避免部分客户端按 latin-1 解码
        "Content-Type": JSON_UTF8,
        "Cache-Control": CACHE_OK,
      },
    })
  } catch {
    // getLatestDigest 内部已经吞掉网络错误；这里兜底，保证任何异常都是 JSON 503
    return unavailable()
  }
}
