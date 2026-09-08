import { getAllPosts } from "@/lib/mdx"

export const dynamic = "force-static"

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://infinitescope.site"
).replace(/\/$/, "")

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function GET() {
  const posts = await getAllPosts()
  const latest = posts.slice(0, 20)
  const lastBuild = posts[0]?.updatedAt ?? posts[0]?.date

  const items = latest
    .map((post) => {
      const url = `${SITE_URL}/blog/${post.slug}`
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${new Date(post.date).toUTCString()}</pubDate>`,
        `      <description>${escapeXml(post.description)}</description>`,
        ...post.tags.map(
          (tag) => `      <category>${escapeXml(tag)}</category>`
        ),
        "    </item>",
      ].join("\n")
    })
    .join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>InfBlog</title>
    <link>${SITE_URL}</link>
    <description>记录技术思考、设计实践与生活片段</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date(lastBuild ?? Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
