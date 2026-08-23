import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isCollectibleId } from "@/lib/collectibles"
import { clientIp, createRateLimiter } from "@/lib/rate-limit"

// 防脚本连点刷概率：同 IP 60s 最多 5 次领取请求。
const claimLimiter = createRateLimiter({ windowMs: 60_000, max: 5 })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401 })
  }

  if (claimLimiter.limited(clientIp(req))) {
    return NextResponse.json(
      { ok: false, message: "操作太频繁，请稍后再试" },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const itemId = body?.itemId

    if (typeof itemId !== "string" || !isCollectibleId(itemId)) {
      return NextResponse.json({ ok: false, message: "无效的藏品" }, { status: 400 })
    }

    const existing = await prisma.userCollectible.findUnique({
      where: { userId_itemId: { userId: session.user.id, itemId } },
    })

    if (existing) {
      return NextResponse.json({ ok: true, newlyClaimed: false })
    }

    await prisma.userCollectible.create({
      data: { userId: session.user.id, itemId },
    })

    return NextResponse.json({ ok: true, newlyClaimed: true })
  } catch {
    return NextResponse.json({ ok: false, message: "领取失败" }, { status: 500 })
  }
}
