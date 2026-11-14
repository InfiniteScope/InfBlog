import { createHash } from "node:crypto"
import type { ReactElement } from "react"

import { compileMDX } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypePrettyCode from "rehype-pretty-code"

import { mdxComponents } from "@/components/mdx-components"
import { normalizeMdxSource } from "@/lib/mdx-normalize"
import { rehypeStyleObject } from "@/lib/rehype-style-object"

/**
 * 文章/文库正文的 MDX 渲染缓存。
 *
 * 背景：这个项目的所有页面都是动态渲染（根布局 Shell 里的 auth()），
 * 每次请求都会把 4~5 万字的正文重新跑一遍 remark/rehype + KaTeX + Shiki。
 * 对公式多的长文实测服务端 TTFB 1.1~1.5s，公网 3s+。
 *
 * 这里缓存的是 `compileMDX` 产出的 React 元素树（编译结果），
 * 命中时只做一次常规 React 渲染，跳过最贵的 MDX 编译 / KaTeX / Shiki 阶段。
 * key 里带内容哈希，正文一变就自动失效，不会读到旧内容。
 *
 * 注意：这是**进程内内存缓存**，只增不减地占用几十 MB；容量有意压得很小，
 * 只保热点（最近访问的几篇）。重启进程即清空，无需手动失效。
 */
const MAX_ENTRIES = 3

const cache = new Map<string, ReactElement>()
const inFlight = new Map<string, Promise<ReactElement>>()

function touch(key: string, value: ReactElement) {
  // Map 保持插入顺序：删了再塞回去 = 移到队尾（最近使用）
  cache.delete(key)
  cache.set(key, value)
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

async function compile(source: string): Promise<ReactElement> {
  const { content } = await compileMDX({
    source,
    components: mdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [
          rehypeKatex,
          [
            rehypePrettyCode,
            {
              // 跟随站点明暗主题（next-themes .dark class）
              theme: { light: "github-light", dark: "github-dark" },
              keepBackground: false,
              defaultLang: "plaintext",
            },
          ],
          // 必须最后：把 Shiki/Katex 的内联 style 字符串转成 JSX 对象
          rehypeStyleObject,
        ],
      },
    },
  })
  return content
}

/**
 * 按 `slug + 正文哈希` 缓存编译后的 MDX 元素。
 * 同一篇内容不变时多次调用直接复用；内容改了哈希变了就会重新编译。
 * 并发的首次请求共用同一个编译 Promise，避免冷启动时重复编译。
 */
export async function renderMdxCached(
  slug: string,
  rawSource: string
): Promise<ReactElement> {
  const source = normalizeMdxSource(rawSource)
  const hash = createHash("sha1").update(source).digest("base64url")
  const key = `${slug}:${hash}`

  const hit = cache.get(key)
  if (hit) {
    touch(key, hit)
    return hit
  }

  const pending = inFlight.get(key)
  if (pending) return pending

  const job = compile(source).then(
    (content) => {
      inFlight.delete(key)
      touch(key, content)
      return content
    },
    (error) => {
      inFlight.delete(key)
      throw error
    }
  )
  inFlight.set(key, job)
  return job
}
