"use client"

import { useEffect, useState } from "react"
import { GitBranch, Star } from "lucide-react"
import Link from "next/link"

import { LoadingDots } from "@/components/ui/loading-dots"

export interface GithubRepo {
  name: string
  description: string | null
  language: string | null
  stargazers_count: number
  html_url: string
  fork: boolean
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  C: "#555555",
  "C++": "#f34b7d",
  Java: "#b07219",
  Rust: "#dea584",
  Go: "#00ADD8",
  Vue: "#41b883",
  CSS: "#663399",
  HTML: "#e34c26",
  MDX: "#fcb32c",
  Shell: "#89e051",
}

function languageColor(lang: string | null) {
  if (!lang) return undefined
  return LANGUAGE_COLORS[lang] ?? "#8b5cf6"
}

/**
 * GitHub 最近项目列表（客户端拉取 /api/github/repos，
 * 该 API 路由在服务端调 GitHub API + 缓存，避免 CORS 与限流）。
 */
export function GithubProjects() {
  const [repos, setRepos] = useState<GithubRepo[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/github/repos")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: GithubRepo[]) => {
        if (!cancelled) setRepos(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error || (repos && repos.length === 0)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <GitBranch className="h-6 w-6 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">GitHub 仓库暂不可用</p>
      </div>
    )
  }

  if (!repos) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingDots />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col justify-center gap-1">
      {repos.slice(0, 4).map((repo) => (
        <Link
          key={repo.name}
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/5"
        >
          <GitBranch className="h-3.5 w-3.5 shrink-0 text-accent/70" />
          <span className="min-w-0 truncate font-mono text-sm font-medium text-foreground group-hover:text-accent">
            {repo.name}
          </span>
          {repo.description && (
            <span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground lg:inline">
              {repo.description}
            </span>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
            {repo.language && (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: languageColor(repo.language) }}
              />
            )}
            <Star className="h-3 w-3" />
            {repo.stargazers_count}
          </span>
        </Link>
      ))}
    </div>
  )
}
