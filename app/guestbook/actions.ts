"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const guestbookSchema = z.object({
  author: z.string().max(50, "昵称过长").optional().or(z.literal("")),
  content: z.string().min(1, "请输入留言内容").max(1000, "留言内容过长"),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
  website: z.string().url("网址格式不正确").optional().or(z.literal("")),
  mode: z.enum(["nickname", "anonymous"]),
})

export type GuestbookMessage = Awaited<
  ReturnType<typeof getGuestbookMessages>
>[number]

export type GuestbookFormState =
  | {
      success: false
      errors: Partial<Record<keyof z.infer<typeof guestbookSchema>, string[]>>
      message?: string
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
