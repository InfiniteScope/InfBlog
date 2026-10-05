"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { visitorKeyFromHeaders } from "@/lib/post-stats"
import { createWaitLimiter, describeRetryAfter } from "@/lib/rate-limit"

const guestbookSchema = z.object({
  author: z.string().max(50, "昵称过长").optional().or(z.literal("")),
  content: z.string().min(1, "请输入留言内容").max(500, "留言内容不能超过 500 字"),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
  website: z.string().url("网址格式不正确").optional().or(z.literal("")),
  mode: z.enum(["nickname", "anonymous"]),
})

/**
 * 留言墙限速（匿名与昵称两种模式共用一个额度）：
 * 前 2 条不限速，第 3 条起两次提交间隔 ≥15 秒，5 分钟静默后刷新。
 * 身份按 IP+UA 指纹，与点赞/弹幕同源。
 */
const GUESTBOOK_MINI_FREE = 2
const GUESTBOOK_MIN_INTERVAL_MS = 15_000
const GUESTBOOK_WINDOW_MS = 5 * 60_000

const guestbookLimiter = createWaitLimiter({
  miniFree: GUESTBOOK_MINI_FREE,
  minIntervalMs: GUESTBOOK_MIN_INTERVAL_MS,
  windowMs: GUESTBOOK_WINDOW_MS,
})

export type GuestbookMessage = Awaited<
  ReturnType<typeof getGuestbookMessages>
>[number]

export type GuestbookFormState =
  | {
      success: false
      errors: Partial<Record<keyof z.infer<typeof guestbookSchema>, string[]>>
      message?: string
      /** 被限速时剩余的冷却毫秒数（UI 可据此提示/倒计时） */
      retryAfterMs?: number
    }
  | { success: true; message: string }
  | null

export async function submitGuestbookMessage(
  _prevState: GuestbookFormState,
  formData: FormData
): Promise<GuestbookFormState> {
  const rawData = {
    author: formData.get("author")?.toString() ?? "",
    content: formData.get("content")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    website: formData.get("website")?.toString() ?? "",
    mode: formData.get("mode")?.toString() ?? "anonymous",
  }

  const validated = guestbookSchema.safeParse(rawData)

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  const session = await auth()

  let author = validated.data.author?.trim()
  let isAnonymous = validated.data.mode === "anonymous"
  let userId: string | undefined

  if (!isAnonymous) {
    if (!session?.user) {
      return {
        success: false,
        errors: {},
        message: "使用昵称留言需要先登录",
      }
    }
    author = session.user.nickname || session.user.name || "用户"
    userId = session.user.id
  }

  if (isAnonymous && !author) {
    author = "匿名用户"
  }

  const limit = guestbookLimiter.check(visitorKeyFromHeaders(await headers()))
  if (!limit.allowed) {
    return {
      success: false,
      errors: {},
      message: `留言过于频繁，请 ${describeRetryAfter(limit.retryAfterMs)}后再试`,
      retryAfterMs: limit.retryAfterMs,
    }
  }

  try {
    await prisma.guestbookMessage.create({
      data: {
        author: author!,
        content: validated.data.content,
        email: validated.data.email || null,
        website: validated.data.website || null,
        isAnonymous,
        userId,
      },
    })
    revalidatePath("/guestbook")
    return { success: true, message: "留言已提交" }
  } catch {
    return {
      success: false,
      errors: {},
      message: "提交失败，请稍后重试",
    }
  }
}

export async function deleteGuestbookMessage(id: number) {
  const session = await auth()
  if (!session?.user) {
    return { success: false as const, message: "请先登录" }
  }

  const message = await prisma.guestbookMessage.findUnique({
    where: { id },
  })
  if (!message) {
    return { success: false as const, message: "留言不存在" }
  }

  const isOwner = session.user.role === "OWNER"
  const isAuthor = !!message.userId && message.userId === session.user.id

  if (!isOwner && !isAuthor) {
    return { success: false as const, message: "没有权限删除该留言" }
  }

  try {
    await prisma.guestbookMessage.delete({ where: { id } })
    revalidatePath("/guestbook")
    return { success: true as const, message: "已删除" }
  } catch {
    return { success: false as const, message: "删除失败，请稍后重试" }
  }
}

export async function getGuestbookMessages() {
  return prisma.guestbookMessage.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
  })
}
