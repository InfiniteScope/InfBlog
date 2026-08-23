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
  "Spring",
  "Tailwind CSS",
  "Prisma",
  "SQLite",
  "Three.js",
  "Motion",
  "Auth.js",
]

/**
 * 首页 skill 展示卡片：
 * 左 - GitHub 最近项目；右 - 斜向流动技术栈。
 */
export function SkillShowcase() {
  return (
    <section className="grid min-w-0 gap-4 lg:grid-cols-[1fr_1.2fr]">
      {/* GitHub projects */}
      <div className="min-w-0 rounded-xl border border-border bg-card/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Github className="h-3.5 w-3.5 text-accent" />
          <h3 className="font-display text-sm tracking-wide text-muted-foreground">
            // RECENT_PROJECTS
          </h3>
        </div>
        <GithubProjects />
      </div>
      {/* Tech stack: slanted flowing marquee */}
      <div className="relative min-h-[160px] overflow-hidden rounded-xl border border-border bg-card/50">
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md bg-card/70 px-1.5 py-0.5 backdrop-blur-sm">
          <Layers className="h-3.5 w-3.5 text-accent" />
          <h3 className="font-display text-sm tracking-wide text-muted-foreground">
            // TECH_STACK
          </h3>
        </div>
        <TechMarquee items={TECH_STACK} className="pt-6" />
      </div>
    </section>
  )
}
