import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkMdx from "remark-mdx"
import remarkMath from "remark-math"
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

/**
 * 注意：**必须带 remarkMath**。
 * 之前这里只有 remarkParse + remarkMdx + remarkGfm，导致正文内联公式里的
 * `{...}`（如 `$(s_{2i}, s_{2i+1})$`）被当成 MDX 表达式交给 acorn 解析，
 * 抛 "Could not parse expression with acorn" → 整篇文章 500。
 * 顺序与 /feed.xml 的管线保持一致（remarkMdx 后接 remarkMath）。
 */
const processor = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(remarkMath)
  .use(remarkGfm)

/** 极端情况下的兜底：正则按行提取 h2/h3，绝不让目录解析把整页拖崩 */
function extractHeadingsFallback(markdown: string): TocHeading[] {
  const headings: TocHeading[] = []
  let inFence = false

  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!match) continue

    const text = match[2]
      .replace(/`([^`]*)`/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_~]/g, "")
      .replace(/<[^>]+>/g, "")
      .trim()

    if (text) {
      headings.push({
        depth: match[1].length,
        text,
        id: slugifyHeading(text),
      })
    }
  }

  return headings
}

/**
 * 从文章正文提取目录条目（h2/h3；h1 是文章标题、h4+ 过深不入目录）。
 */
export function extractHeadings(markdown: string): TocHeading[] {
  try {
    const tree = processor.parse(markdown) as { children?: unknown[] }
    const headings: TocHeading[] = []
    const visit = (nodes: unknown[]) => {
      for (const node of nodes) {
        const n = node as {
          type?: string
          depth?: number
          children?: unknown[]
        }
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
  } catch (error) {
    // 内容里有解析器处理不了的写法时，退化为按行提取（目录可能略糙，但页面不会 500）
    console.error("[headings] MDX parse failed, using fallback:", error)
    return extractHeadingsFallback(markdown)
  }
}
