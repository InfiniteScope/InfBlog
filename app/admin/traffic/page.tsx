import { notFound } from "next/navigation"

import { auth } from "@/auth"
import {
  DIRECT_SOURCE,
  INTERNAL_SOURCE,
  getReferralRows,
  recentDates,
} from "@/lib/referral"

export const metadata = {
  title: "流量来源 | InfBlog",
}

const TOTAL_DAYS = 30
const VISIBLE_DAYS = 14

const SOURCE_LABEL: Record<string, string> = {
  [DIRECT_SOURCE]: "直接访问",
  [INTERNAL_SOURCE]: "站内跳转",
}

function sourceLabel(source: string) {
  return SOURCE_LABEL[source] ?? source
}

function isExternal(source: string) {
  return source !== DIRECT_SOURCE && source !== INTERNAL_SOURCE
}

export default async function AdminTrafficPage() {
  const session = await auth()
  if (session?.user?.role !== "OWNER") notFound()

  const dates = recentDates(TOTAL_DAYS)
  const rows = await getReferralRows(dates[0])

  const today = dates[TOTAL_DAYS - 1]
  const weekStart = dates[TOTAL_DAYS - 7]
  const visibleDates = dates.slice(-VISIBLE_DAYS)

  const bySource = new Map<string, Map<string, number>>()
  const dailyTotals = new Map<string, number>()
  let total30 = 0
  let total7 = 0
  let totalToday = 0
  let external30 = 0

  for (const row of rows) {
    total30 += row.count
    if (row.date >= weekStart) total7 += row.count
    if (row.date === today) totalToday += row.count
    if (isExternal(row.source)) external30 += row.count

    const perDate = bySource.get(row.source) ?? new Map<string, number>()
    perDate.set(row.date, row.count)
    bySource.set(row.source, perDate)
    dailyTotals.set(row.date, (dailyTotals.get(row.date) ?? 0) + row.count)
  }

  const sources = [...bySource.entries()]
    .map(([source, perDate]) => ({
      source,
      perDate,
      total: [...perDate.values()].reduce((sum, n) => sum + n, 0),
      external: isExternal(source),
    }))
    // 外部来源优先（这是你最关心的），direct / internal 排最后
    .sort((a, b) => {
      if (a.external !== b.external) return a.external ? -1 : 1
      return b.total - a.total
    })

  const externalShare = total30 > 0 ? (external30 / total30) * 100 : 0

  const cards = [
    { label: "今日访问", value: totalToday },
    { label: "近 7 天", value: total7 },
    { label: "近 30 天", value: total30 },
    { label: "外部来源占比（30 天）", value: `${externalShare.toFixed(1)}%` },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="space-y-1">
        <h2 className="font-display text-xl tracking-tight">流量来源</h2>
        <p className="text-sm text-muted-foreground">
          每个标签页首次进入记一次，已过滤爬虫/无头浏览器；Referer
          缺失的外链会被归入「直接访问」。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card/50 p-4"
          >
            <p className="font-mono text-2xl font-medium tabular-nums">
              {card.value}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {total30 === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground">
          还没有来源数据（这个功能从部署后开始累积）。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card/50">
          <table className="w-full min-w-[760px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  来源
                </th>
                {visibleDates.map((date) => (
                  <th
                    key={date}
                    className="px-2 py-2 text-center font-mono text-[10px] font-normal text-muted-foreground"
                  >
                    {date.slice(5)}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  30 天
                </th>
              </tr>
            </thead>
            <tbody>
              {sources.map(({ source, perDate, total, external }) => (
                <tr key={source} className="border-b border-border/50 last:border-0">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-card/95 px-3 py-2">
                    <span className={external ? "text-foreground" : "text-muted-foreground"}>
                      {sourceLabel(source)}
                    </span>
                  </td>
                  {visibleDates.map((date) => {
                    const count = perDate.get(date) ?? 0
                    return (
                      <td
                        key={date}
                        className="px-2 py-2 text-center tabular-nums text-muted-foreground"
                      >
                        {count > 0 ? (
                          <span className={external ? "text-foreground" : undefined}>
                            {count}
                          </span>
                        ) : (
                          "·"
                        )}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {total}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-medium">
                <td className="sticky left-0 z-10 bg-muted/40 px-3 py-2">合计</td>
                {visibleDates.map((date) => (
                  <td key={date} className="px-2 py-2 text-center tabular-nums">
                    {dailyTotals.get(date) ?? 0}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">{total30}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        说明：表格展示最近 {VISIBLE_DAYS} 天的每日明细，右侧「30 天」是完整 30
        天合计。外部来源排在前面；「直接访问」「站内跳转」是辅助口径。
        很多聚合站的外链会带 <code className="font-code">rel="noreferrer"</code>
        ，Referer 被抹掉后只能计入直接访问，所以平台流量可能被低估。
      </p>
    </div>
  )
}
