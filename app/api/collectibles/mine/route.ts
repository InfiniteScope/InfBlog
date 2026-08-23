import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ items: [] })
  }

  const collectibles = await prisma.userCollectible.findMany({
    where: { userId: session.user.id },
    select: { itemId: true },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({
    items: collectibles.map((c) => c.itemId),
  })
}
