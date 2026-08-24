import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

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
const CACHE_PATH = path.join(process.cwd(), "data", "github-repos-cache.json")

function filterRepos(raw: Array<{
  name: string
  description: string | null
  language: string | null
  stargazers_count: number
  html_url: string
  fork: boolean
}>): GithubRepo[] {
  const wanted = siteConfig.githubRepos
  return raw
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
}

async function readCache(): Promise<GithubRepo[] | undefined> {
  try {
    const content = await fs.readFile(CACHE_PATH, "utf-8")
    return JSON.parse(content) as GithubRepo[]
  } catch {
    return undefined
  }
}

/**
 * GitHub 公开仓库列表（服务端代理）。
 * - 无 token 未认证请求限流 60 次/小时/IP，加缓存降低占用
 * - 若配置了 GITHUB_TOKEN，使用认证请求（限流更高，大陆连通性更好）
 * - 失败时降级到 data/github-repos-cache.json，全挂返回空数组（前端显示"暂不可用"）
 */
export async function GET() {
  try {
    const headers: Record<string, string> = {
      "User-Agent": "infblog",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    }
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    const res = await fetch(
      "https://api.github.com/users/InfiniteScope/repos?sort=updated&per_page=100",
      {
        headers,
        next: { revalidate: REVALIDATE_SECONDS },
      }
    )

    if (!res.ok) {
      console.warn(`GitHub API ${res.status}, falling back to cache`)
      const cached = await readCache()
      if (cached) {
        return NextResponse.json(cached, {
          headers: { "Cache-Control": `public, max-age=${REVALIDATE_SECONDS}` },
        })
      }
      throw new Error(`GitHub API ${res.status}`)
    }

    const raw = (await res.json()) as Array<{
      name: string
      description: string | null
      language: string | null
      stargazers_count: number
      html_url: string
      fork: boolean
    }>
    const repos = filterRepos(raw)

    return NextResponse.json(repos, {
      headers: { "Cache-Control": `public, max-age=${REVALIDATE_SECONDS}` },
    })
  } catch (error) {
    console.error("GitHub repos proxy failed:", error)
    const cached = await readCache()
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": `public, max-age=${REVALIDATE_SECONDS}` },
      })
    }
    return NextResponse.json([])
  }
}
