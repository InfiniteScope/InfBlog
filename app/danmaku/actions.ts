"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const danmakuSchema = z.object({
  content: z.string().min(1, "弹幕内容不能为空").max(100, "弹幕内容过长"),
})

export type DanmakuFormState =
  | {
      success: false
      error: string
    }
  | { success: true }
  | null

export async function submitDanmaku(
  _prevState: DanmakuFormState,
  formData: FormData
): Promise<DanmakuFormState> {
  const content = formData.get("content")?.toString() ?? ""
  const validated = danmakuSchema.safeParse({ content })

  if (!validated.success) {
    return {
      success: false,
      error: validated.error.errors[0]?.message ?? "输入不合法",
    }
  }

  try {
    await prisma.danmaku.create({
      data: {
        content: validated.data.content,
        color: "#ffffff",
        speed: 1,
      },
    })
    revalidatePath("/")
    return { success: true }
  } catch {
    return {
      success: false,
      error: "发送失败，请稍后重试",
    }
  }
}

export async function getDanmakuList(limit = 20) {
  return prisma.danmaku.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

export async function getDanmakuAll() {
  return prisma.danmaku.findMany({
    orderBy: { createdAt: "desc" },
  })
}

export async function removeDanmaku(id: number) {
  const session = await auth()
  if (!session?.user) {
    return { success: false as const, message: "请先登录" }
  }

  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return { success: false as const, message: "权限不足" }
  }

  try {
    await prisma.danmaku.delete({ where: { id } })
    revalidatePath("/")
    revalidatePath("/admin/danmaku")
    return { success: true as const, message: "弹幕已删除" }
  } catch {
    return { success: false as const, message: "删除失败" }
  }
}
