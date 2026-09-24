"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auth } from "@/auth"
import {
  deletePost,
  generateUniqueSlug,
  getPostBySlug,
  savePost,
  type Post,
} from "@/lib/mdx"
import {
  deleteUploadFiles,
  extractImageUrls,
  getUploadFilenames,
} from "@/lib/images"
import {
  deleteUpdate,
  generateUpdateSlug,
  saveUpdate,
  type Update,
} from "@/lib/updates"
import {
  deleteDoc,
  generateUniqueDocSlug,
  getDocBySlug,
  saveDoc,
  type Doc,
} from "@/lib/docs"

const updateSchema = z.object({
  title: z.string().max(200, "标题过长").optional().or(z.literal("")),
  content: z.string().min(1, "内容不能为空"),
  date: z.string().min(1, "时间不能为空"),
})

export type UpdateFormState =
  | {
      success: false
      errors: Partial<Record<keyof z.infer<typeof updateSchema>, string[]>>
      message?: string
    }
  | { success: true; slug: string; message: string }
  | null

const postSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200, "标题过长"),
  description: z.string().min(1, "描述不能为空").max(500, "描述过长"),
  content: z.string().min(1, "内容不能为空"),
  tags: z.string().optional(),
  coverImage: z
    .string()
    .regex(
      /^(\/uploads\/.*|https?:\/\/.*)?$/,
      "封面图片地址格式不正确"
    )
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/, { message: "日期格式不正确" })
    .optional(),
})

export type AdminFormState =
  | {
      success: false
      errors: Partial<Record<keyof z.infer<typeof postSchema>, string[]>>
      message?: string
    }
  | { success: true; slug: string; message: string }
  | null

export async function createPost(
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const session = await auth()
  if (!session?.user) {
    return { success: false, errors: {}, message: "请先登录" }
  }
  if (session.user.role !== "OWNER") {
    return { success: false, errors: {}, message: "只有站长可以发布文章" }
  }

  const rawData = {
    title: formData.get("title")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    content: formData.get("content")?.toString() ?? "",
    tags: formData.get("tags")?.toString() ?? "",
    coverImage: formData.get("coverImage")?.toString() ?? "",
  }

  const validated = postSchema.safeParse(rawData)

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  const slug = await generateUniqueSlug(validated.data.title)

  try {
    const post: Post = {
      slug,
      title: validated.data.title,
      description: validated.data.description,
      content: validated.data.content,
      tags: validated.data.tags
        ? validated.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      coverImage: validated.data.coverImage || undefined,
      date: new Date().toISOString(),
    }

    await savePost(post)
    revalidatePath("/")
    revalidatePath("/blog")
    revalidatePath("/admin/posts")
    return { success: true, slug, message: "文章发布成功" }
  } catch {
    return {
      success: false,
      errors: {},
      message: "发布失败，请检查文件系统权限",
    }
  }
}

export async function updatePost(
  slug: string,
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
    const decodedSlug = decodeURIComponent(slug)
    const session = await auth()
    if (!session?.user) {
      return { success: false, errors: {}, message: "请先登录" }
    }
    if (session.user.role !== "OWNER") {
      return { success: false, errors: {}, message: "只有站长可以修改文章" }
    }

  const rawData = {
    title: formData.get("title")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    content: formData.get("content")?.toString() ?? "",
    tags: formData.get("tags")?.toString() ?? "",
    coverImage: formData.get("coverImage")?.toString() ?? "",
    date: formData.get("date")?.toString() ?? "",
  }

  const validated = postSchema.safeParse(rawData)

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  try {
    const post: Post = {
      slug: decodedSlug,
      title: validated.data.title,
      description: validated.data.description,
      content: validated.data.content,
      tags: validated.data.tags
        ? validated.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      coverImage: validated.data.coverImage || undefined,
      date: validated.data.date ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await savePost(post)
    revalidatePath("/")
    revalidatePath("/blog")
    revalidatePath(`/blog/${decodedSlug}`)
    revalidatePath("/admin/posts")
    return { success: true, slug: decodedSlug, message: "文章更新成功" }
  } catch {
    return {
      success: false,
      errors: {},
      message: "更新失败，请检查文件系统权限",
    }
  }
}

export async function removePost(slug: string) {
  const session = await auth()
  if (!session?.user) {
    return { success: false as const, message: "请先登录" }
  }

  if (session.user.role !== "OWNER") {
    return { success: false as const, message: "只有站长可以删除文章" }
  }

  try {
    const post = await getPostBySlug(slug)
    const imageUrls = extractImageUrls(post.content, post.coverImage)
    const uploadFilenames = getUploadFilenames(imageUrls)

    await deleteUploadFiles(uploadFilenames)
    await deletePost(post.slug)

    revalidatePath("/")
    revalidatePath("/blog")
    revalidatePath(`/blog/${post.slug}`)
    revalidatePath("/admin/posts")
    return { success: true as const, message: "文章已删除" }
  } catch (error) {
    console.error("[removePost] failed:", error)
    return { success: false as const, message: "删除失败" }
  }
}

export async function createUpdate(
  _prevState: UpdateFormState,
  formData: FormData
): Promise<UpdateFormState> {
  const session = await auth()
  if (session?.user?.role !== "OWNER") {
    return { success: false, errors: {}, message: "只有站长可以发布动态" }
  }

  const rawData = {
    title: formData.get("title")?.toString() ?? "",
    content: formData.get("content")?.toString() ?? "",
    date: formData.get("date")?.toString() ?? "",
  }

  const validated = updateSchema.safeParse(rawData)
  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  const slug = generateUpdateSlug(validated.data.title || "update")

  try {
    const update: Update = {
      slug,
      title: validated.data.title ?? "",
      content: validated.data.content,
      date: new Date(validated.data.date).toISOString(),
    }

    await saveUpdate(update)
    revalidatePath("/")
    revalidatePath("/updates")
    revalidatePath("/admin/updates")
    return { success: true, slug, message: "动态发布成功" }
  } catch {
    return {
      success: false,
      errors: {},
      message: "发布失败，请检查文件系统权限",
    }
  }
}

export async function updateUpdate(
  slug: string,
  _prevState: UpdateFormState,
  formData: FormData
): Promise<UpdateFormState> {
  const session = await auth()
  if (session?.user?.role !== "OWNER") {
    return { success: false, errors: {}, message: "只有站长可以编辑动态" }
  }

  const rawData = {
    title: formData.get("title")?.toString() ?? "",
    content: formData.get("content")?.toString() ?? "",
    date: formData.get("date")?.toString() ?? "",
  }

  const validated = updateSchema.safeParse(rawData)
  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  try {
    const update: Update = {
      slug,
      title: validated.data.title ?? "",
      content: validated.data.content,
      date: new Date(validated.data.date).toISOString(),
    }

    await saveUpdate(update)
    revalidatePath("/")
    revalidatePath("/updates")
    revalidatePath("/admin/updates")
    return { success: true, slug, message: "动态更新成功" }
  } catch {
    return {
      success: false,
      errors: {},
      message: "更新失败，请检查文件系统权限",
    }
  }
}

export async function removeUpdate(slug: string) {
  const session = await auth()
  if (session?.user?.role !== "OWNER") {
    return { success: false as const, message: "只有站长可以删除动态" }
  }

  try {
    await deleteUpdate(slug)
    revalidatePath("/")
    revalidatePath("/updates")
    revalidatePath("/admin/updates")
    return { success: true as const, message: "动态已删除" }
  } catch (error) {
    console.error("[removeUpdate] failed:", error)
    return { success: false as const, message: "删除失败" }
  }
}

/* ==================== 文库档案 ==================== */

const docSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200, "标题过长"),
  description: z.string().min(1, "描述不能为空").max(500, "描述过长"),
  content: z.string().min(1, "内容不能为空"),
  tags: z.string().optional(),
  coverImage: z
    .string()
    .regex(
      /^(\/uploads\/.*|https?:\/\/.*)?$/,
      "封面图片地址格式不正确"
    )
    .optional(),
  source: z.string().max(200, "来源名称过长").optional().or(z.literal("")),
  sourceUrl: z
    .string()
    .regex(/^(https?:\/\/.*)?$/, "来源链接格式不正确")
    .optional()
    .or(z.literal("")),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/, { message: "日期格式不正确" })
    .optional(),
})

export type DocFormState = AdminFormState

function docFromForm(
  slug: string,
  data: z.infer<typeof docSchema>,
  dateOverride?: string
): Doc {
  return {
    slug,
    title: data.title,
    description: data.description,
    content: data.content,
    tags: data.tags
      ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [],
    coverImage: data.coverImage || undefined,
    source: data.source?.trim() || undefined,
    sourceUrl: data.sourceUrl?.trim() || undefined,
    date: dateOverride ?? data.date ?? new Date().toISOString(),
  }
}

export async function createDoc(
  _prevState: DocFormState,
  formData: FormData
): Promise<DocFormState> {
  const session = await auth()
  if (session?.user?.role !== "OWNER") {
    return { success: false, errors: {}, message: "只有站长可以新建档案" }
  }

  const rawData = {
    title: formData.get("title")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    content: formData.get("content")?.toString() ?? "",
    tags: formData.get("tags")?.toString() ?? "",
    coverImage: formData.get("coverImage")?.toString() ?? "",
    source: formData.get("source")?.toString() ?? "",
    sourceUrl: formData.get("sourceUrl")?.toString() ?? "",
  }

  const validated = docSchema.safeParse(rawData)
  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  const slug = await generateUniqueDocSlug(validated.data.title)

  try {
    await saveDoc(docFromForm(slug, validated.data))
    revalidatePath("/docs")
    revalidatePath("/admin/docs")
    return { success: true, slug, message: "档案创建成功" }
  } catch {
    return {
      success: false,
      errors: {},
      message: "创建失败，请检查文件系统权限",
    }
  }
}

export async function updateDoc(
  slug: string,
  _prevState: DocFormState,
  formData: FormData
): Promise<DocFormState> {
  const decodedSlug = decodeURIComponent(slug)
  const session = await auth()
  if (session?.user?.role !== "OWNER") {
    return { success: false, errors: {}, message: "只有站长可以修改档案" }
  }

  const rawData = {
    title: formData.get("title")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    content: formData.get("content")?.toString() ?? "",
    tags: formData.get("tags")?.toString() ?? "",
    coverImage: formData.get("coverImage")?.toString() ?? "",
    source: formData.get("source")?.toString() ?? "",
    sourceUrl: formData.get("sourceUrl")?.toString() ?? "",
    date: formData.get("date")?.toString() ?? "",
  }

  const validated = docSchema.safeParse(rawData)
  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  try {
    const doc = {
      ...docFromForm(decodedSlug, validated.data),
      updatedAt: new Date().toISOString(),
    }
    await saveDoc(doc)
    revalidatePath("/docs")
    revalidatePath(`/docs/${decodedSlug}`)
    revalidatePath("/admin/docs")
    return { success: true, slug: decodedSlug, message: "档案更新成功" }
  } catch {
    return {
      success: false,
      errors: {},
      message: "更新失败，请检查文件系统权限",
    }
  }
}

export async function removeDoc(slug: string) {
  const session = await auth()
  if (session?.user?.role !== "OWNER") {
    return { success: false as const, message: "只有站长可以删除档案" }
  }

  try {
    const doc = await getDocBySlug(slug)
    const imageUrls = extractImageUrls(doc.content, doc.coverImage)
    const uploadFilenames = getUploadFilenames(imageUrls)

    await deleteUploadFiles(uploadFilenames)
    await deleteDoc(doc.slug)

    revalidatePath("/docs")
    revalidatePath(`/docs/${doc.slug}`)
    revalidatePath("/admin/docs")
    return { success: true as const, message: "档案已删除" }
  } catch (error) {
    console.error("[removeDoc] failed:", error)
    return { success: false as const, message: "删除失败" }
  }
}
