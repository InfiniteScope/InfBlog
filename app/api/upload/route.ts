import fs from "node:fs/promises"
import path from "node:path"
import { randomBytes } from "node:crypto"

import { auth } from "@/auth"

const uploadsDirectory = path.join(process.cwd(), "public/uploads")

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
])

const maxSize = 5 * 1024 * 1024 // 5 MB

const mimeToExt: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
}

type UploadResult =
  | { success: true; url: string }
  | { success: false; message: string }

function jsonResponse(result: UploadResult, status: number) {
  return new Response(JSON.stringify(result), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return jsonResponse({ success: false, message: "请先登录" }, 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ success: false, message: "请求体格式不正确" }, 400)
  }

  const { filename, dataUrl } = body as { filename?: string; dataUrl?: string }

  if (!dataUrl || typeof dataUrl !== "string") {
    return jsonResponse({ success: false, message: "缺少图片数据" }, 400)
  }

  const match = dataUrl.match(/^data:([a-zA-Z+\/]+);base64,(.+)$/)
  if (!match) {
    return jsonResponse({ success: false, message: "图片数据格式不正确" }, 400)
  }

  const mimeType = match[1]
  const base64 = match[2]

  if (!allowedMimeTypes.has(mimeType)) {
    return jsonResponse(
      { success: false, message: "仅支持 JPG、PNG、GIF、WebP、AVIF、SVG 图片" },
      400
    )
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(base64, "base64")
  } catch {
    return jsonResponse({ success: false, message: "Base64 解码失败" }, 400)
  }

  if (buffer.length > maxSize) {
    return jsonResponse(
      { success: false, message: "图片大小不能超过 5 MB" },
      400
    )
  }

  const ext =
    path.extname(filename || "") || mimeToExt[mimeType] || ".bin"
  const timestamp = Date.now().toString(36)
  const random = randomBytes(4).toString("hex")
  const outputFilename = `${timestamp}-${random}${ext}`
  const filePath = path.join(uploadsDirectory, outputFilename)

  try {
    await fs.mkdir(uploadsDirectory, { recursive: true })
    await fs.writeFile(filePath, buffer)
    return jsonResponse(
      { success: true, url: `/uploads/${outputFilename}` },
      200
    )
  } catch {
    return jsonResponse({ success: false, message: "图片保存失败" }, 500)
  }
}
