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
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          // ABOUT
        </p>
        <h1 className="font-display text-4xl tracking-tight">关于</h1>
      </section>

      <section className="v2-card space-y-4 p-6">
        <h2 className="font-display text-2xl tracking-tight">关于我</h2>
        <p className="leading-7 text-muted-foreground">
          你好，我是 {siteConfig.nickname}，欢迎访问我的博客。
          <br></br>
          这是一个分享、讨论、记录的平台，也是一个留给我自己的坐标；聊聊技术、生活，以及一起见证 AI 冲击下世界的变迁。
        </p>
        <p className="leading-7 text-muted-foreground">
          本站博客内容保证 AIGC 占比少于 20%（文库与部分转载内容由于来自外链，并不保证 AIGC 比例）。
          期待真诚的分享交流能创造更多乐趣、留下更多意义。
        </p>
      </section>

      <section className="v2-card space-y-4 p-6">
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

      <section className="v2-card space-y-4 p-6">
        <h2 className="font-display text-2xl tracking-tight">友情链接</h2>
        <div className="flex flex-wrap gap-3">
          {siteConfig.links.friends.map((friend) => (
            <a
              key={friend.name}
              href={friend.url}
              target="_blank"
              rel="noopener noreferrer"
              className="v2-tag group"
            >
              {friend.name}
              <ExternalLink className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-accent" />
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
