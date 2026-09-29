import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * 名片卡直达入口（PCB 名片二维码指向 /card）：
 * 1. 计数：counters 表 key=card-visits 自增（失败不阻塞跳转）
 * 2. 跳转主页并带 120s 的 from_card cookie，主页据此弹欢迎弹窗
 *
 * 注意：重定向必须用**相对 Location**（"/"）——服务端 next start 跑在
 * nginx 反代后，request.url 是内部地址（http://localhost:3000），
 * 用它构造绝对跳转会把线上用户甩到 localhost。
 */
export async function GET() {
  try {
    await prisma.counter.upsert({
      where: { key: "card-visits" },
      create: { key: "card-visits", value: 1 },
      update: { value: { increment: 1 } },
    })
  } catch (error) {
    console.error("[card] counter increment failed:", error)
  }

  const response = new NextResponse(null, {
    status: 307,
    headers: { Location: "/" },
  })
  response.cookies.set("from_card", "1", {
    maxAge: 120,
    path: "/",
    sameSite: "lax",
  })
  return response
}
