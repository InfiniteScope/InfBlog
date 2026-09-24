import fs from "node:fs/promises"
import path from "node:path"
import matter from "gray-matter"

import { computeContentMeta, generateSlug } from "@/lib/mdx"

/**
 * 文库档案（content/docs/*.mdx）：长篇图文资料的最小收纳单位。
 * 结构与 Post 平行，额外支持 source/sourceUrl（资料出处）。
 */
export interface Doc {
  slug: string
  title: string
  date: string
  updatedAt?: string
  description: string
  source?: string
  sourceUrl?: string
  tags: string[]
  coverImage?: string
  content: string
  wordCount?: number
  imageCount?: number
  readingTime?: string
}

const docsDirectory = path.join(process.cwd(), "content/docs")

async function ensureDocsDirectory() {
  await fs.mkdir(docsDirectory, { recursive: true })
}

export async function getAllDocs(): Promise<Doc[]> {
  await ensureDocsDirectory()
  const files = await fs.readdir(docsDirectory)
  const mdxFiles = files.filter((file) => file.endsWith(".mdx"))

  const docs = await Promise.all(
    mdxFiles.map(async (file) => {
      const slug = file.replace(/\.mdx$/, "")
      return getDocBySlug(slug)
    })
  )

  return docs.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

export async function getDocBySlug(rawSlug: string): Promise<Doc> {
  const slug = decodeURIComponent(rawSlug)
  const filePath = path.join(docsDirectory, `${slug}.mdx`)
  const fileContent = await fs.readFile(filePath, "utf-8")
  const { data, content } = matter(fileContent)
  const meta = computeContentMeta(content)

  const stats = await fs.stat(filePath)
  const fileDate = stats.birthtime.toISOString()
  const fileUpdatedAt = stats.mtime.toISOString()

  return {
    slug,
    title: data.title ?? slug,
    date: data.date ?? fileDate,
    updatedAt: data.updatedAt ?? fileUpdatedAt,
    description: data.description ?? "",
    source: data.source ?? undefined,
    sourceUrl: data.sourceUrl ?? undefined,
    tags: data.tags ?? [],
    coverImage: data.coverImage ?? undefined,
    content,
    ...meta,
  }
}

export async function getDocSlugs(): Promise<string[]> {
  await ensureDocsDirectory()
  const files = await fs.readdir(docsDirectory)
  return files.filter((file) => file.endsWith(".mdx")).map((file) => file.replace(/\.mdx$/, ""))
}

export function serializeDoc(doc: Doc): string {
  const frontmatter: Record<string, unknown> = {
    title: doc.title,
    date: doc.date,
    description: doc.description,
    tags: doc.tags,
  }

  if (doc.coverImage) {
    frontmatter.coverImage = doc.coverImage
  }
  if (doc.source) {
    frontmatter.source = doc.source
  }
  if (doc.sourceUrl) {
    frontmatter.sourceUrl = doc.sourceUrl
  }
  if (doc.updatedAt) {
    frontmatter.updatedAt = doc.updatedAt
  }

  return matter.stringify(doc.content, frontmatter)
}

export async function saveDoc(doc: Doc): Promise<void> {
  await ensureDocsDirectory()
  const filePath = path.join(docsDirectory, `${doc.slug}.mdx`)
  await fs.writeFile(filePath, serializeDoc(doc), "utf-8")
}

export async function deleteDoc(slug: string): Promise<void> {
  const filePath = path.join(docsDirectory, `${slug}.mdx`)
  await fs.unlink(filePath)
}

export async function generateUniqueDocSlug(title: string): Promise<string> {
  let slug = generateSlug(title)
  const existing = new Set(await getDocSlugs())

  if (!existing.has(slug)) {
    return slug
  }

  let suffix = 2
  while (existing.has(`${slug}-${suffix}`)) {
    suffix++
  }
  return `${slug}-${suffix}`
}
