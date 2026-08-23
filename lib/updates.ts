import fs from "node:fs/promises"
import path from "node:path"
import matter from "gray-matter"

export interface Update {
  slug: string
  date: string
  title: string
  content: string
}

const updatesDirectory = path.join(process.cwd(), "content/updates")

async function ensureUpdatesDirectory() {
  await fs.mkdir(updatesDirectory, { recursive: true })
}

export async function getUpdates(): Promise<Update[]> {
  await ensureUpdatesDirectory()
  const files = await fs.readdir(updatesDirectory)
  const mdxFiles = files.filter((file) => file.endsWith(".mdx"))

  const updates = await Promise.all(
    mdxFiles.map(async (file) => {
      const slug = file.replace(/\.mdx$/, "")
      return getUpdateBySlug(slug)
    })
  )

  return updates.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

export async function getUpdateBySlug(rawSlug: string): Promise<Update> {
  const slug = decodeURIComponent(rawSlug)
  const filePath = path.join(updatesDirectory, `${slug}.mdx`)
  const fileContent = await fs.readFile(filePath, "utf-8")
  const { data, content } = matter(fileContent)

  return {
    slug,
    date: data.date ?? new Date().toISOString(),
    title: data.title ?? "",
    content,
  }
}

export function serializeUpdate(update: Update): string {
  const frontmatter: Record<string, unknown> = {
    title: update.title,
    date: update.date,
  }
  return matter.stringify(update.content, frontmatter)
}

export async function saveUpdate(update: Update): Promise<void> {
  await ensureUpdatesDirectory()
  const filePath = path.join(updatesDirectory, `${update.slug}.mdx`)
  await fs.writeFile(filePath, serializeUpdate(update), "utf-8")
}

export async function deleteUpdate(slug: string): Promise<void> {
  const filePath = path.join(updatesDirectory, `${slug}.mdx`)
  await fs.unlink(filePath)
}

export function generateUpdateSlug(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)

  const stamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[-:T]/g, "")

  return base ? `${stamp}-${base}` : `update-${stamp}`
}
