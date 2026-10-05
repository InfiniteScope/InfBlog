"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { visitorKeyFromHeaders } from "@/lib/post-stats"
import { createWaitLimiter, describeRetryAfter } from "@/lib/rate-limit"

const danmakuSchema = z.object({
  content: z.string().min(1, "弹幕内容不能为空").max(50, "弹幕内容不能超过 50 字"),
})

/**
 * 弹幕限速（不改"人人可发、无需登录"的既定设计，只防刷屏）：
 * 前 3 条不做任何限制；第 4 条起两次提交间隔 ≥3 秒；
 * 5 分钟内没有新提交则计数与冷却一并清零（即"冷却 5 分钟刷新一次"）。
 * 身份沿用点赞同源的 IP+UA 指纹（visitorKey），登录与否都按同一维度计。
 */
const DANMAKU_MINI_FREE = 3
const DANMAKU_MIN_INTERVAL_MS = 3_000
const DANMAKU_WINDOW_MS = 5 * 60_000

const danmakuLimiter = createWaitLimiter({
  miniFree: DANMAKU_MINI_FREE,
  minIntervalMs: DANMAKU_MIN_INTERVAL_MS,
  windowMs: DANMAKU_WINDOW_MS,
})

export type DanmakuFormState =
  | {
      success: false
      error: string
      /** 被限速时剩余的冷却毫秒数（UI 用于倒计时展示） */
      retryAfterMs?: number
      /** 被限速时刻（ms 时间戳），UI 据此做本地倒计时，避免与水合时间不一致 */
      limitedAt?: number
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

  const visitorKey = visitorKeyFromHeaders(await headers())
  const limit = danmakuLimiter.check(visitorKey)
  if (!limit.allowed) {
    return {
      success: false,
      error: `发送过快，请 ${describeRetryAfter(limit.retryAfterMs)}后再试`,
      retryAfterMs: limit.retryAfterMs,
      limitedAt: Date.now(),
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
