import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkMdx from "remark-mdx"
import remarkGfm from "remark-gfm"

/**
 * 标题锚点工具：渲染端（mdx-components）与目录端（TOC）共用同一套
 * slug 生成规则，保证目录链接与标题 id 严格一致。
 */
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export interface TocHeading {
  depth: number
  text: string
  id: string
}

/** markdown/mdx 语法树中提取纯文本（text / inlineCode / 强调 / 链接等） */
function nodeText(node: unknown): string {
  if (!node || typeof node !== "object") return ""
  const n = node as { value?: unknown; children?: unknown[] }
  if (typeof n.value === "string") return n.value
  if (Array.isArray(n.children)) {
    return n.children.map(nodeText).join("")
  }
  return ""
}

const processor = unified().use(remarkParse).use(remarkMdx).use(remarkGfm)

/**
 * 从文章正文提取目录条目（h2/h3；h1 是文章标题、h4+ 过深不入目录）。
 */
export function extractHeadings(markdown: string): TocHeading[] {
  const tree = processor.parse(markdown) as { children?: unknown[] }
  const headings: TocHeading[] = []
  const visit = (nodes: unknown[]) => {
    for (const node of nodes) {
      const n = node as { type?: string; depth?: number; children?: unknown[] }
      if (n.type === "heading" && typeof n.depth === "number") {
        if (n.depth >= 2 && n.depth <= 3) {
          const text = nodeText(n).trim()
          if (text) {
            headings.push({
              depth: n.depth,
              text,
              id: slugifyHeading(text),
            })
          }
        }
      }
      if (Array.isArray(n.children)) visit(n.children)
    }
  }
  visit(tree.children ?? [])
  return headings
}
