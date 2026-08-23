import { prisma } from "@/lib/prisma"

function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export async function trackPageView(): Promise<void> {
  const today = localDateString()
  await prisma.pageView.upsert({
    where: { date: today },
    create: { date: today, count: 1 },
    update: { count: { increment: 1 } },
  })
}

export async function getViewStats() {
  const today = localDateString()

  const since7 = new Date()
  since7.setDate(since7.getDate() - 6)

  const [total, week, todayCount] = await Promise.all([
    prisma.pageView.aggregate({ _sum: { count: true } }),
    prisma.pageView.findMany({
      where: {
        date: {
          gte: localDateString(since7),
        },
      },
      select: { count: true },
    }),
    prisma.pageView.findUnique({
      where: { date: today },
      select: { count: true },
    }),
  ])

  return {
    total: total._sum.count ?? 0,
    week: week.reduce((sum, row) => sum + row.count, 0),
    today: todayCount?.count ?? 0,
  }
}
