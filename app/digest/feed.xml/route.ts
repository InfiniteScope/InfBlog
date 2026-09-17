import {
  getDailyDigests,
  type DailyDigest,
  type Digest,
} from "@/lib/digest"

/**
 * 科技资讯日报 RSS：每天 08:15（Asia/Shanghai）后出现当日一条，
 * 内容 = 前一日晚报 + 当日早报（由 glance-of-tech 生成）。
 *
 * 沿用 /feed.xml 的经验：content:encoded 用 CDATA 包裹 + `]]>` 守护、
 * XML 全部转义、数据层 AbortSignal 每次新建（见 lib/digest.ts）。
 */
export const revalidate = 300

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://infinitescope.site"
).replace(/\/$/, "")

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

/** 当日日报的推送时间：08:15（Asia/Shanghai，无夏令时固定 +08:00） */
function publishTime(date: string): Date {
  return new Date(`${date}T08:15:00+08:00`)
}

export async function GET() {
  const now = Date.now()
  const reports = (await getDailyDigests(10)).filter(
    (report) => now >= publishTime(report.date).getTime()
  )

  const items = reports.map(renderItem).join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>科技资讯日报 · InfBlog</title>
    <link>${SITE_URL}/digest</link>
    <description>每日 08:15 推送：前一日晚报 + 今日早报，由 glance-of-tech 自动抓取与总结</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/digest/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  })
}

function renderItem(report: DailyDigest): string {
  const { date, evening, morning } = report
  const url = `${SITE_URL}/digest/${date}/morning`
  const pubDate = publishTime(date).toUTCString()
  const total = (evening?.items.length ?? 0) + morning.items.length
  const description = `本期包含${evening ? ` ${evening.date} 晚报、` : ""}${date} 早报，共 ${total} 条科技资讯（glance-of-tech 自动生成）`

  const body = [
    `<p>本期包含${evening ? `前一日晚报（${evening.items.length} 条）与` : ""}今日早报（${morning.items.length} 条），由 glance-of-tech 自动抓取与总结。</p>`,
    evening ? renderSection("前一日晚报", evening) : "",
    renderSection("今日早报", morning),
  ]
    .filter(Boolean)
    .join("\n")

  return [
    "    <item>",
    `      <title>${escapeXml(`科技资讯日报 · ${date}`)}</title>`,
    `      <link>${url}</link>`,
    `      <guid isPermaLink="true">${url}</guid>`,
    `      <pubDate>${pubDate}</pubDate>`,
    `      <description>${escapeXml(description)}</description>`,
    `      <content:encoded><![CDATA[${toCdata(body)}]]></content:encoded>`,
    "    </item>",
  ].join("\n")
}

function renderSection(label: string, digest: Digest): string {
  const parts: string[] = [`<h2>${escapeXml(label)} · ${digest.date}</h2>`]
  if (digest.degraded) {
    parts.push("<p><em>（本期 LLM 摘要生成失败，为纯清单模式）</em></p>")
  }
  if (digest.summary) {
    parts.push(`<p><em>${escapeXml(digest.summary)}</em></p>`)
  }

  for (const [source, items] of groupBySource(digest)) {
    parts.push(`<h3>${escapeXml(source)}</h3>`, "<ol>")
    for (const item of items) {
      const summary = item.summary
        ? ` — ${escapeXml(item.summary)}`
        : ""
      const tags =
        item.tags.length > 0
          ? ` <small>[${escapeXml(item.tags.join(" / "))}]</small>`
          : ""
      parts.push(
        `<li><a href="${escapeXml(item.url)}">${escapeXml(item.title)}</a>${summary}${tags}</li>`
      )
    }
    parts.push("</ol>")
  }
  return parts.join("\n")
}

/** 按来源分组（保持条目原有顺序） */
function groupBySource(digest: Digest): [string, Digest["items"]][] {
  const order: string[] = []
  const bySource = new Map<string, Digest["items"]>()
  for (const item of digest.items) {
    if (!bySource.has(item.source)) {
      bySource.set(item.source, [])
      order.push(item.source)
    }
    bySource.get(item.source)!.push(item)
  }
  return order.map((source) => [source, bySource.get(source)!])
}
