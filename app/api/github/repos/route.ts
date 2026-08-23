import { NextResponse } from "next/server"

import { siteConfig } from "@/lib/config"

interface GithubRepo {
  name: string
  description: string | null
  language: string | null
  stargazers_count: number
  html_url: string
  fork: boolean
}

const REVALIDATE_SECONDS = 600

/**
 * GitHub 公开仓库列表（服务端代理）。
 * - 无 token 未认证请求限流 60 次/小时/IP，加缓存降低占用
 * - 失败时按顺序降级，全挂返回空数组（前端显示"暂不可用"）
 */
export async function GET() {
  try {
    const res = await fetch(
      "https://api.github.com/users/InfiniteScope/repos?sort=updated&per_page=100",
      {
        headers: {
          "User-Agent": "infblog",
          Accept: "application/vnd.github+json",
        },
        next: { revalidate: REVALIDATE_SECONDS },
      }
    )
    if (!res.ok) throw new Error(`GitHub API ${res.status}`)

    const raw = (await res.json()) as Array<{
      name: string
      description: string | null
      language: string | null
      stargazers_count: number
      html_url: string
      fork: boolean
    }>

    // 只返回首页配置选中的仓库，按 config 顺序排。
    // 注意：不排除 fork——config 显式选中的仓库（如 npm-safe 是 fork）应照常展示
    const wanted = siteConfig.githubRepos
    const repos: GithubRepo[] = raw
      .filter((r) => wanted.includes(r.name))
      .sort((a, b) => wanted.indexOf(a.name) - wanted.indexOf(b.name))
      .map((r) => ({
        name: r.name,
        description: r.description,
        language: r.language,
        stargazers_count: r.stargazers_count,
        html_url: r.html_url,
        fork: r.fork,
      }))

    return NextResponse.json(repos, {
      headers: { "Cache-Control": `public, max-age=${REVALIDATE_SECONDS}` },
    })
  } catch {
    return NextResponse.json([])
  }
}
