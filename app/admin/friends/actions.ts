"use server"

import { revalidatePath } from "next/cache"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * 友链管理（仅站长）。
 *
 * 为什么放在数据库而不是 lib/config.ts：后台要能在线增删改，
 * 而 config 是构建期常量，改一次就得重新 build + 部署。
 */
export type FriendActionResult = { ok: true } | { ok: false; message: string }

const MAX_LINKS = 50
const MAX_NAME = 30
const MAX_URL = 300
const MAX_NOTE = 60

async function isOwner() {
  const session = await auth()
  return session?.user?.role === "OWNER"
}

function revalidateFriends() {
  // 侧边栏在根布局里，关于页单独刷；页面本身是动态渲染，
  // 这里的 revalidatePath 主要是让客户端 router.refresh() 拿到最新树。
  revalidatePath("/", "layout")
  revalidatePath("/about")
  revalidatePath("/admin/friends")
}

interface FriendInput {
  name: string
  url: string
  note?: string
}

function validate(input: FriendInput) {
  const name = (input.name ?? "").trim()
  const url = (input.url ?? "").trim()
  const note = (input.note ?? "").trim()

  if (!name) return { ok: false as const, error: "名称不能为空" }
  if (name.length > MAX_NAME) return { ok: false as const, error: `名称最长 ${MAX_NAME} 个字` }
  if (!url) return { ok: false as const, error: "链接不能为空" }
  if (url.length > MAX_URL) return { ok: false as const, error: "链接过长" }
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false as const, error: "只支持 http/https 链接" }
    }
  } catch {
    return { ok: false as const, error: "请填写完整 URL（含 https://）" }
  }
  if (note.length > MAX_NOTE) return { ok: false as const, error: `备注最长 ${MAX_NOTE} 个字` }

  return { ok: true as const, value: { name, url, note: note || null } }
}

export async function createFriendLink(
  input: FriendInput
): Promise<FriendActionResult> {
  if (!(await isOwner())) return { ok: false, message: "只有站长可以管理友链" }

  const checked = validate(input)
  if (!checked.ok) return { ok: false, message: checked.error }

  const count = await prisma.friendLink.count()
  if (count >= MAX_LINKS) {
    return { ok: false, message: `最多只能有 ${MAX_LINKS} 条友链` }
  }

  const last = await prisma.friendLink.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  })

  await prisma.friendLink.create({
    data: { ...checked.value, sortOrder: (last?.sortOrder ?? -1) + 1 },
  })
  revalidateFriends()
  return { ok: true }
}

export async function updateFriendLink(
  id: number,
  input: FriendInput
): Promise<FriendActionResult> {
  if (!(await isOwner())) return { ok: false, message: "只有站长可以管理友链" }
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "参数不合法" }
  }

  const checked = validate(input)
  if (!checked.ok) return { ok: false, message: checked.error }

  const existing = await prisma.friendLink.findUnique({ where: { id } })
  if (!existing) return { ok: false, message: "这条友链不存在（可能已被删除）" }

  await prisma.friendLink.update({ where: { id }, data: checked.value })
  revalidateFriends()
  return { ok: true }
}

export async function deleteFriendLink(id: number): Promise<FriendActionResult> {
  if (!(await isOwner())) return { ok: false, message: "只有站长可以管理友链" }

  const existing = await prisma.friendLink.findUnique({ where: { id } })
  if (!existing) return { ok: false, message: "这条友链不存在（可能已被删除）" }

  await prisma.friendLink.delete({ where: { id } })
  revalidateFriends()
  return { ok: true }
}

/**
 * 上移/下移：按当前顺序整体重排 sortOrder，
 * 避免历史数据里 sortOrder 重复导致“换了位置但看起来没动”。
 */
export async function moveFriendLink(
  id: number,
  direction: "up" | "down"
): Promise<FriendActionResult> {
  if (!(await isOwner())) return { ok: false, message: "只有站长可以管理友链" }

  const all = await prisma.friendLink.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true },
  })
  const index = all.findIndex((item) => item.id === id)
  const target = direction === "up" ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= all.length) return { ok: true }

  const ids = all.map((item) => item.id)
  const swapped = [...ids]
  swapped[index] = ids[target]
  swapped[target] = ids[index]

  await prisma.$transaction(
    swapped.map((linkId, position) =>
      prisma.friendLink.update({
        where: { id: linkId },
        data: { sortOrder: position },
      })
    )
  )
  revalidateFriends()
  return { ok: true }
}
