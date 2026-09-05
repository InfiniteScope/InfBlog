"use client"

import { GithubProjects } from "@/components/home/github-projects"
import { TechMarquee } from "@/components/home/tech-marquee"
import { SectionHeading } from "@/components/ui/section-heading"

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
 * - 与 hero 标题同高（由外层 h-[224px] 控制）
 * - marquee 边缘渐隐蒙版，流动不突兀
 */
export function SkillShowcase() {
  return (
    <div className="grid h-full min-w-0 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-stretch gap-4 lg:gap-6">
      {/* GitHub projects（无边框） */}
      <div className="flex min-w-0 flex-col">
        <SectionHeading className="mb-2">// RECENT_PROJECTS</SectionHeading>
        <div className="min-h-0 flex-1">
          <GithubProjects />
        </div>
      </div>

      {/* Tech stack: slanted flowing marquee（无边框 + 边缘渐隐） */}
      <div className="relative flex min-w-0 flex-col">
        <SectionHeading className="mb-2">// TECH_STACK</SectionHeading>
        <div className="marquee-fade-x relative h-28 overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
          <TechMarquee items={TECH_STACK} />
        </div>
      </div>
    </div>
  )
}
