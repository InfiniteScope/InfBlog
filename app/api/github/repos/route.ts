import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

import { siteConfig } from "@/lib/config"

interface GithubRepo {
  name: string
  full_name: string
  description: string | null
  language: string | null
  stargazers_count: number
  html_url: string
  fork: boolean
}

const REVALIDATE_SECONDS = 600
const CACHE_PATH = path.join(process.cwd(), "data", "github-repos-cache.json")

async function readCache(): Promise<GithubRepo[] | undefined> {
  try {
    const content = await fs.readFile(CACHE_PATH, "utf-8")
    return JSON.parse(content) as GithubRepo[]
  } catch {
    return undefined
  }
}

/** 成功后写回缓存，作为 API 不可用时的降级数据 */
async function writeCache(repos: GithubRepo[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true })
    await fs.writeFile(CACHE_PATH, JSON.stringify(repos, null, 2), "utf-8")
  } catch {
    /* 缓存写入失败不影响响应 */
  }
}

/**
 * 首页 pin 项目（服务端代理 GitHub API）。
 * 逐个按 `owner/repo` 拉取（支持跨 owner 的 pin），保持配置顺序；
 * 单个仓库拉取失败即跳过（不存在则隐藏）。
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

    const results = await Promise.all(
      siteConfig.githubRepos.map(async (fullName): Promise<GithubRepo | null> => {
        try {
          const res = await fetch(`https://api.github.com/repos/${fullName}`, {
            headers,
            next: { revalidate: REVALIDATE_SECONDS },
          })
          if (!res.ok) {
            console.warn(`GitHub API ${res.status} for ${fullName}`)
            return null
          }
          const r = (await res.json()) as {
            name: string
            full_name: string
            description: string | null
            language: string | null
            stargazers_count: number
            html_url: string
            fork: boolean
          }
          return {
            name: r.name,
            full_name: r.full_name,
            description: r.description,
            language: r.language,
            stargazers_count: r.stargazers_count,
            html_url: r.html_url,
            fork: !!r.fork,
          }
        } catch (error) {
          console.warn(`GitHub API fetch failed for ${fullName}:`, error)
          return null
        }
      })
    )
    const repos = results.filter((r): r is GithubRepo => r !== null)

    if (repos.length === 0) {
      const cached = await readCache()
      if (cached) {
        return NextResponse.json(cached, {
          headers: { "Cache-Control": `public, max-age=${REVALIDATE_SECONDS}` },
        })
      }
      return NextResponse.json([])
    }

    void writeCache(repos)
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
