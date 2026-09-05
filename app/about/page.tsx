import { ExternalLink } from "lucide-react"

import { siteConfig } from "@/lib/config"

export const metadata = {
  title: "关于 | InfBlog",
  description: "关于 InfBlog 与我",
}

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-8">
      <section className="space-y-2">
        <p className="font-mono text-xs tracking-widest text-accent">// ABOUT</p>
        <h1 className="font-display text-4xl tracking-tight">关于</h1>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card/50 p-6">
        <h2 className="font-display text-2xl tracking-tight">关于我</h2>
        <p className="leading-7 text-muted-foreground">
          你好，我是 {siteConfig.realName}。这是一个正在建设中的个人博客，
          用于记录技术学习、设计思考与生活随笔。
        </p>
        <p className="leading-7 text-muted-foreground">
          站点目前采用 Next.js App Router + Tailwind CSS + shadcn/ui 构建，
          数据库使用 Prisma + SQLite，内容通过 MDX 管理。
        </p>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card/50 p-6">
        <h2 className="font-display text-2xl tracking-tight">联系方式</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2">
            <span className="font-mono text-accent">EMAIL</span>
            <span className="text-muted-foreground">{siteConfig.email}</span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-accent">GITHUB</span>
            <span className="text-muted-foreground">{siteConfig.github}</span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-accent">LOCATION</span>
            <span className="text-muted-foreground">{siteConfig.location}</span>
          </li>
        </ul>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card/50 p-6">
        <h2 className="font-display text-2xl tracking-tight">友情链接</h2>
        <div className="flex flex-wrap gap-3">
          {siteConfig.links.friends.map((friend) => (
            <a
              key={friend.name}
              href={friend.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm transition-colors hover:border-accent/50 hover:bg-accent/10"
            >
              {friend.name}
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-accent" />
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
