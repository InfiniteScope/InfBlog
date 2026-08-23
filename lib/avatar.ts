import fs from "node:fs/promises"
import path from "node:path"
import { randomBytes } from "node:crypto"

import { prisma } from "@/lib/prisma"

const AVATARS_DIR = path.join(process.cwd(), "public", "uploads", "avatars")

/** Matches data URLs produced by the client compressor (webp/jpeg/png). */
const DATA_URL_PATTERN = /^data:image\/(webp|jpeg|png|jpg);base64,(.+)$/

const encodedPreview = (s: string) => `${s.slice(0, 16)}…`

/** Decode a client-compressed avatar and persist it inside avatars dir. */
export async function saveAvatarDataUrl(
  dataUrl: string,
  userId: string
): Promise<string> {
  const match = dataUrl.match(DATA_URL_PATTERN)
  if (!match) {
    throw new Error("头像格式不正确，请重新选择图片")
  }

  const mime = match[1]
  const base64 = match[2]
  const buffer = Buffer.from(base64, "base64")

  if (buffer.length > 1024 * 1024) {
    throw new Error("压缩后的头像文件过大")
  }

  await fs.mkdir(AVATARS_DIR, { recursive: true })

  const ext = mime === "png" ? "png" : mime === "jpeg" || mime === "jpg" ? "jpg" : "webp"
  const filename = `${userId}-${randomBytes(6).toString("hex")}.${ext}`
  const filePath = path.join(AVATARS_DIR, filename)
  await fs.writeFile(filePath, buffer)

  return `/uploads/avatars/${filename}`
}

/** Remove an avatar file that was stored under /uploads/avatars. */
async function deleteAvatarFile(relativeUrl: string): Promise<void> {
  const marker = "/uploads/avatars/"
  const idx = relativeUrl.indexOf(marker)
  if (idx === -1) return
  const name = relativeUrl.slice(idx + marker.length)
  if (!name || name.includes("/") || name.includes("..")) return
  try {
    await fs.unlink(path.join(AVATARS_DIR, name))
  } catch {
    // ignore missing file
  }
}

/** Persist an avatar for an existing user, replacing the previous file. */
export async function updateUserAvatar(
  userId: string,
  dataUrl: string
): Promise<string> {
  const previous = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  })

  const url = await saveAvatarDataUrl(dataUrl, userId)

  await prisma.user.update({
    where: { id: userId },
    data: { image: url },
  })

  if (previous?.image) {
    await deleteAvatarFile(previous.image)
  }

  return url
}

export { encodedPreview }
