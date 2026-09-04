"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { grantCollectible } from "@/lib/collectibles-grant"
import {
  cacheResourceIcon,
  isExternalIconUrl,
} from "@/lib/resource-icon-cache"

const resourceSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(100, "名称过长"),
  summary: z
    .string()
    .min(1, "缩略简介不能为空")
    .max(30, "缩略简介不能超过 30 字"),
  description: z.string().min(1, "详细介绍不能为空").max(3000, "详细介绍不能超过 3000 字"),
  icon: z
    .string()
    .refine(
      (v) =>
        v === "" ||
        v.startsWith("/uploads/") ||
        z.string().url().safeParse(v).success,
      "图标链接格式不正确"
    )
    .optional()
    .or(z.literal("")),
  homepageUrl: z.string().url("官网链接格式不正确").optional().or(z.literal("")),
  downloadUrl: z.string().url("下载链接格式不正确").min(1, "下载链接不能为空"),
  tags: z.string().max(500, "标签过多").optional().or(z.literal("")),
})

/** 解析逗号分隔的 tags（去重、限长、限数量） */
function parseTags(raw?: string): string[] {
  const names = [...new Set(
    (raw ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.slice(0, 12))
  )]
  return names.slice(0, 5)
}

/** 同步资源的标签关联（不存在则创建） */
async function syncResourceTags(resourceId: string, names: string[]) {
  await prisma.resourceTag.deleteMany({ where: { resourceId } })
  for (const name of names) {
    const tag = await prisma.tag.upsert({
      where: { name },
      create: { name },
      update: {},
    })
    await prisma.resourceTag.upsert({
      where: { resourceId_tagId: { resourceId, tagId: tag.id } },
      create: { resourceId, tagId: tag.id },
      update: {},
    })
  }
}

export type ResourceFormState =
  | {
      success: false
      errors: Partial<Record<keyof z.infer<typeof resourceSchema>, string[]>>
      message?: string
    }
  | {
      success: true
      message: string
      pendingReview: boolean
      resourceId: string
      /** 是否同时授予 Sharing?Hero. 藏品 */
      collectibleGranted?: boolean
    }
  | null

function parseResourceForm(formData: FormData) {
  return {
    name: formData.get("name")?.toString() ?? "",
    summary: formData.get("summary")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    icon: formData.get("icon")?.toString() ?? "",
    homepageUrl: formData.get("homepageUrl")?.toString() ?? "",
    downloadUrl: formData.get("downloadUrl")?.toString() ?? "",
    tags: formData.get("tags")?.toString() ?? "",
  }
}

export async function submitResource(
  _prevState: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  const session = await auth()
  const user = session?.user
  if (!user?.id) {
    return { success: false, errors: {}, message: "请先登录" }
  }

  const rawData = parseResourceForm(formData)
  const validated = resourceSchema.safeParse(rawData)
  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  const isOwner = user.role === "OWNER" || user.role === "ADMIN"
  const status = isOwner ? "APPROVED" : "PENDING"

  const rawIcon = validated.data.icon || ""
  const icon = rawIcon && isExternalIconUrl(rawIcon)
    ? await cacheResourceIcon(rawIcon)
    : rawIcon || undefined

  try {
    const resource = await prisma.resource.create({
      data: {
        name: validated.data.name,
        summary: validated.data.summary,
        description: validated.data.description,
        icon,
        homepageUrl: validated.data.homepageUrl || undefined,
        downloadUrl: validated.data.downloadUrl,
        status,
        isOwnerPost: isOwner,
        authorId: user.id,
      },
    })

    await syncResourceTags(resource.id, parseTags(validated.data.tags))

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "RESOURCE_SUBMITTED",
        message: isOwner
          ? "您已成功上传资源，感谢您为本站做出的贡献！"
          : "您已成功上传资源，感谢您为本站做出的贡献！请等待网站管理员审核。",
      },
    })

    // "Sharing?Hero." collectible: first resource submission, no review needed
    const granted = await grantCollectible(user.id, "sharing-hero")

    revalidatePath("/resources")
    revalidatePath("/resources/mine")
    revalidatePath("/admin/resources")

    return {
      success: true,
      message: isOwner
        ? "资源已上传并公开显示"
        : "资源已上传，等待管理员审核",
      pendingReview: !isOwner,
      resourceId: resource.id,
      collectibleGranted: granted,
    }
  } catch {
    return {
      success: false,
      errors: {},
      message: "提交失败，请稍后重试",
    }
  }
}

function canEditResource(
  user: { id: string; role: string },
  resource: { authorId: string | null }
) {
  return (
    user.role === "OWNER" ||
    user.role === "ADMIN" ||
    (resource.authorId != null && resource.authorId === user.id)
  )
}

export async function updateResource(
  resourceId: string,
  _prevState: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  const session = await auth()
  const user = session?.user
  if (!user?.id) {
    return { success: false, errors: {}, message: "请先登录" }
  }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  })
  if (!resource) {
    return { success: false, errors: {}, message: "资源不存在" }
  }
  if (!canEditResource(user, resource)) {
    return { success: false, errors: {}, message: "只有发布者、站长或管理员可以编辑该资源" }
  }

  const rawData = parseResourceForm(formData)
  const validated = resourceSchema.safeParse(rawData)
  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  const rawIcon = validated.data.icon || ""
  const icon = rawIcon && isExternalIconUrl(rawIcon)
    ? await cacheResourceIcon(rawIcon)
    : rawIcon || undefined

  try {
    await prisma.resource.update({
      where: { id: resourceId },
      data: {
        name: validated.data.name,
        summary: validated.data.summary,
        description: validated.data.description,
        icon,
        homepageUrl: validated.data.homepageUrl || undefined,
        downloadUrl: validated.data.downloadUrl,
      },
    })

    await syncResourceTags(resourceId, parseTags(validated.data.tags))

    revalidatePath("/resources")
    revalidatePath("/resources/mine")
    revalidatePath(`/resources/${resourceId}`)

    return {
      success: true,
      message: "资源已更新",
      pendingReview: false,
      resourceId,
    }
  } catch {
    return {
      success: false,
      errors: {},
      message: "更新失败，请稍后重试",
    }
  }
}

export async function deleteResource(resourceId: string) {
  const session = await auth()
  const user = session?.user
  if (!user?.id) {
    return { success: false as const, message: "请先登录" }
  }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  })
  if (!resource) {
    return { success: false as const, message: "资源不存在" }
  }
  if (!canEditResource(user, resource)) {
    return {
      success: false as const,
      message: "只有发布者、站长或管理员可以删除该资源",
    }
  }

  try {
    await prisma.resource.delete({ where: { id: resourceId } })

    revalidatePath("/resources")
    revalidatePath("/resources/mine")
    revalidatePath("/admin/resources")
    return { success: true as const, message: "资源已删除" }
  } catch {
    return { success: false as const, message: "删除失败，请稍后重试" }
  }
}

export async function reviewResource(
  resourceId: string,
  action: "approve" | "reject"
) {
  const session = await auth()
  if (session?.user?.role !== "OWNER" && session?.user?.role !== "ADMIN") {
    return { success: false as const, message: "没有权限执行此操作" }
  }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  })
  if (!resource) {
    return { success: false as const, message: "资源不存在" }
  }

  try {
    const data: { status: "APPROVED" | "REJECTED"; icon?: string } = {
      status: action === "approve" ? "APPROVED" : "REJECTED",
    }
    if (action === "approve" && resource.icon && isExternalIconUrl(resource.icon)) {
      data.icon = await cacheResourceIcon(resource.icon)
    }
    await prisma.resource.update({
      where: { id: resourceId },
      data,
    })

    if (resource.authorId) {
      await prisma.notification.create({
        data: {
          userId: resource.authorId,
          type: action === "approve" ? "RESOURCE_APPROVED" : "RESOURCE_REJECTED",
          message:
            action === "approve"
              ? `您分享的资源「${resource.name}」已通过审核并上线！`
              : `很遗憾，您分享的资源「${resource.name}」未通过审核。`,
        },
      })
    }

    revalidatePath("/resources")
    revalidatePath("/resources/mine")
    revalidatePath("/admin/resources")
    return { success: true as const, message: "操作成功" }
  } catch {
    return { success: false as const, message: "操作失败，请稍后重试" }
  }
}

export type ResourceCommentActionState = {
  success: boolean
  message: string
} | null

/** 发表资源评论（强制登录） */
export async function submitResourceComment(
  resourceId: string,
  _prevState: ResourceCommentActionState,
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, message: "评论功能需要登录后使用" }
  }

  const content =
    formData.get("content")?.toString().trim() ?? ""
  if (!content) return { success: false, message: "请输入评论内容" }
  if (content.length > 500) return { success: false, message: "评论不能超过 500 字" }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { id: true },
  })
  if (!resource) return { success: false, message: "资源不存在" }

  try {
    await prisma.resourceComment.create({
      data: { resourceId, userId: session.user.id, content },
    })
    revalidatePath(`/resources/${resourceId}`)
    return { success: true, message: "评论已发布" }
  } catch {
    return { success: false, message: "发布失败，请稍后重试" }
  }
}

export async function getMyUnreadCount() {
  const session = await auth()
  if (!session?.user?.id) return 0
  return prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  })
}
