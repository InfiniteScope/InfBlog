import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { clientIp, createWaitLimiter, describeRetryAfter } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const COUNTER_KEY = "post:宇宙非伊甸:antenna"

const antennaLimiter = createWaitLimiter({
  miniFree: 2,
  minIntervalMs: 15_000,
  windowMs: 5 * 60_000,
})

const payloadSchema = z.object({
  signal: z.string().trim().max(80).optional(),
})

export async function GET() {
  try {
    const row = await prisma.counter.findUnique({
      where: { key: COUNTER_KEY },
      select: { value: true },
    })
    return NextResponse.json({ count: row?.value ?? 0 })
  } catch (error) {
    console.error("[antenna] GET failed:", error)
    return NextResponse.json({ count: 0 })
  }
}

export async function POST(request: Request) {
  const ip = clientIp(request)
  const gate = antennaLimiter.check(ip)
  if (!gate.allowed) {
    return NextResponse.json(
      {
        error: `信号冷却中，请 ${describeRetryAfter(gate.retryAfterMs)}后再试`,
        retryAfterMs: gate.retryAfterMs,
      },
      { status: 429 }
    )
  }

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "信号文本过长（最多 80 字）" },
      { status: 400 }
    )
  }

  try {
    const updated = await prisma.counter.upsert({
      where: { key: COUNTER_KEY },
      create: { key: COUNTER_KEY, value: 1 },
      update: { value: { increment: 1 } },
      select: { value: true },
    })
    return NextResponse.json({ count: updated.value })
  } catch (error) {
    console.error("[antenna] POST failed:", error)
    return NextResponse.json(
      { error: "遥测站暂不可用，脉冲未落库" },
      { status: 500 }
    )
  }
}
