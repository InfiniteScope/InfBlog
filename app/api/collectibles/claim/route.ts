import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isCollectibleId } from "@/lib/collectibles"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401 })
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
