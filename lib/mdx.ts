import fs from "node:fs/promises"
import path from "node:path"
import matter from "gray-matter"

export interface Post {
  slug: string
  title: string
  date: string
  updatedAt?: string
  description: string
  tags: string[]
  coverImage?: string
  content: string
  wordCount?: number
  imageCount?: number
  readingTime?: string
}

const postsDirectory = path.join(process.cwd(), "content/posts")

function computeContentMeta(content: string) {
  const cjkMatches = content.match(/[\u4e00-\u9fa5]/g) || []
  const wordMatches = content.match(/[a-zA-Z0-9_]+/g) || []
  const cjkCount = cjkMatches.length
  const wordCount = wordMatches.length
  const total = cjkCount + wordCount
  const minutes = Math.max(1, Math.ceil(total / 350))

  const markdownImages = content.match(/!\[[^\]]*\]\([^)]+\)/g) || []
  const htmlImages = content.match(/<img[\s\S]*?>/gi) || []
  const imageCount = markdownImages.length + htmlImages.length

  return {
    wordCount: total,
    imageCount,
    readingTime: `${minutes} 分钟`,
  }
}

export async function getAllPosts(): Promise<Post[]> {
  const files = await fs.readdir(postsDirectory)
  const mdxFiles = files.filter((file) => file.endsWith(".mdx"))

  const posts = await Promise.all(
    mdxFiles.map(async (file) => {
      const slug = file.replace(/\.mdx$/, "")
      return getPostBySlug(slug)
    })
  )

  return posts.sort(
    (a, b) =>
      new Date(b.updatedAt ?? b.date).getTime() -
      new Date(a.updatedAt ?? a.date).getTime()
  )
}

export async function getPostBySlug(rawSlug: string): Promise<Post> {
  const slug = decodeURIComponent(rawSlug)
  const filePath = path.join(postsDirectory, `${slug}.mdx`)
  const fileContent = await fs.readFile(filePath, "utf-8")
  const { data, content } = matter(fileContent)
  const meta = computeContentMeta(content)

  return {
    slug,
    title: data.title ?? slug,
    date: data.date ?? new Date().toISOString().slice(0, 10),
    updatedAt: data.updatedAt ?? undefined,
    description: data.description ?? "",
    tags: data.tags ?? [],
    coverImage: data.coverImage ?? undefined,
    content,
    ...meta,
  }
}

export async function getPostSlugs(): Promise<string[]> {
  const files = await fs.readdir(postsDirectory)
  return files.filter((file) => file.endsWith(".mdx")).map((file) => file.replace(/\.mdx$/, ""))
}

export function serializePost(post: Post): string {
  const frontmatter: Record<string, unknown> = {
    title: post.title,
    date: post.date,
    description: post.description,
    tags: post.tags,
  }

  if (post.coverImage) {
    frontmatter.coverImage = post.coverImage
  }

  if (post.updatedAt) {
    frontmatter.updatedAt = post.updatedAt
  }

  return matter.stringify(post.content, frontmatter)
}

export async function savePost(post: Post): Promise<void> {
  const filePath = path.join(postsDirectory, `${post.slug}.mdx`)
  await fs.writeFile(filePath, serializePost(post), "utf-8")
}

export async function deletePost(slug: string): Promise<void> {
  const filePath = path.join(postsDirectory, `${slug}.mdx`)
  await fs.unlink(filePath)
}

export function generateSlug(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

  return base || `post-${Date.now().toString(36)}`
}

export async function generateUniqueSlug(title: string): Promise<string> {
  let slug = generateSlug(title)
  const existing = new Set(await getPostSlugs())

  if (!existing.has(slug)) {
    return slug
  }

  let suffix = 2
  while (existing.has(`${slug}-${suffix}`)) {
    suffix++
  }

  return `${slug}-${suffix}`
}
