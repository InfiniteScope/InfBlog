import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkMdx from "remark-mdx"
import remarkMath from "remark-math"
import remarkGfm from "remark-gfm"
import remarkRehype from "remark-rehype"
import { toHtml } from "hast-util-to-html"

import { getAllPosts } from "@/lib/mdx"

export const dynamic = "force-static"

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://infinitescope.site"
).replace(/\/$/, "")

/** content:encoded 是任意 XML，用 CDATA 包 HTML；守护极少见的非法序列 */
const CDATA_END = "]]>"

function toCdata(html: string): string {
  return html.split(CDATA_END).join("]]]]><![CDATA[>")
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/** MDX → hast → HTML 字符串（与博客页面同源管线，含 LaTeX 数学与 GFM） */
const processor = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(remarkMath)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })

function renderPostHtml(mdxSource: string): string {
  const hast = processor.runSync(processor.parse(mdxSource))
  return toHtml(hast, { allowDangerousHtml: true })
}

export async function GET() {
  const posts = await getAllPosts()
  const latest = posts.slice(0, 20)
  const lastBuild = posts[0]?.updatedAt ?? posts[0]?.date

  const items = (
    await Promise.all(
      latest.map(async (post) => {
        const url = `${SITE_URL}/blog/${post.slug}`
        const html = await renderPostHtml(post.content)
        return [
          "    <item>",
          `      <title>${escapeXml(post.title)}</title>`,
          `      <link>${url}</link>`,
          `      <guid isPermaLink="true">${url}</guid>`,
          `      <pubDate>${new Date(post.date).toUTCString()}</pubDate>`,
          `      <description>${escapeXml(post.description)}</description>`,
          `      <content:encoded><![CDATA[${toCdata(html)}]]></content:encoded>`,
          ...post.tags.map(
            (tag) => `      <category>${escapeXml(tag)}</category>`
          ),
          "    </item>",
        ].join("\n")
      })
    )
  ).join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
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
