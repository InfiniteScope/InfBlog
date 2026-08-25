"use client"

import { Github, Layers } from "lucide-react"

import { GithubProjects } from "@/components/home/github-projects"
import { TechMarquee } from "@/components/home/tech-marquee"

const TECH_STACK = [
  "Next.js",
  "App Router",
  "React 19",
  "TypeScript",
  "Vue 3 / Vite",
  "FastAPI",
  "SpringBoot",
  "Tailwind CSS",
  "SQLite",
  "MySQL",
  "JAVA",
  "Python",
  "Three.js",
  "Motion",
  "PostgreSQL",
]

/**
 * 首页技能展示：GitHub 项目 + 技术栈 marquee。
 * - 无外轮廓：与页面背景融合，减少"盒子感"
 * - 与 hero 标题同高（由外层 h-[240px] 控制）
 * - marquee 边缘渐隐蒙版，流动不突兀
 */
export function SkillShowcase() {
  return (
    <div className="grid h-full min-w-0 grid-cols-1 gap-5 lg:grid-cols-[2fr_3fr] lg:gap-6">
      {/* GitHub projects（无边框） */}
      <div className="flex min-w-0 flex-col">
        <div className="mb-2 flex items-center gap-2">
          <Github className="h-3.5 w-3.5 text-accent" />
          <h3 className="font-display text-sm tracking-wide text-muted-foreground">
            // RECENT_PROJECTS
          </h3>
        </div>
        <div className="min-h-0 flex-1">
          <GithubProjects />
        </div>
      </div>

      {/* Tech stack: slanted flowing marquee（无边框 + 边缘渐隐） */}
      <div className="relative flex min-w-0 flex-col">
        <div className="mb-2 flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-accent" />
          <h3 className="font-display text-sm tracking-wide text-muted-foreground">
            // TECH_STACK
          </h3>
        </div>
        <div className="marquee-fade-x relative h-28 overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
          <TechMarquee items={TECH_STACK} />
        </div>
      </div>
    </div>
  )
}
