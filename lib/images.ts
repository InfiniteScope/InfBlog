import fs from "node:fs/promises"
import path from "node:path"

const uploadsDirectory = path.join(process.cwd(), "public/uploads")

// Matches Markdown images: ![alt](url) and ![alt](url "title")
const markdownImageRegex = /!\[([^\]]*)\]\(([^")\s]+)(?:\s+"[^"]*")?\)/g

export function extractImageUrls(
  content: string,
  coverImage?: string
): string[] {
  const urls = new Set<string>()

  if (coverImage) {
    urls.add(coverImage)
  }

  let match: RegExpExecArray | null
  while ((match = markdownImageRegex.exec(content)) !== null) {
    urls.add(match[2])
  }

  return Array.from(urls)
}

export function getUploadFilenames(urls: string[]): string[] {
  return urls
    .filter((url) => url.startsWith("/uploads/"))
    .map((url) => path.basename(url))
}

export async function deleteUploadFiles(filenames: string[]): Promise<void> {
  await Promise.all(
    filenames.map(async (filename) => {
      try {
        await fs.unlink(path.join(uploadsDirectory, filename))
      } catch {
        // Ignore missing-file errors so post deletion still succeeds
      }
    })
  )
}
