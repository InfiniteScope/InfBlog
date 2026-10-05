/**
 * 简介（description）的内联 Markdown 支持。
 *
 * 设计取舍：
 * - 只支持**内联**语法（强调 / 行内代码 / 删除线 / 链接 / 换行），不支持块级
 *   （标题、列表、代码块）——简介是卡片与元信息里的一两行文字，块级语义没有用武之地。
 * - 解析成「片段数组」再由 React 渲染元素，**不用 HTML 字符串 + dangerouslySetInnerHTML**，
 *   因此坏语法会自然退化为字面文本，也不存在 XSS 注入面。
 * - 元信息（generateMetadata）与 RSS 这类必须纯文本的场景走 `stripMarkdown()`。
 *
 * 支持：
 *   **粗体** / __粗体__      *斜体* / _斜体_      ~~删除线~~
 *   `行内代码`               [文字](https://链接)
 *   换行（单个换行渲染为 <br />）
 * 不支持（按字面显示）：块级语法、图片（只取 alt 文本）、原始 HTML（转为纯文本）
 */

export type MdxInlineSegment =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "em"; value: string }
  | { type: "del"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; value: string; href: string }
  | { type: "break" }

/** 链接协议白名单：拒绝 javascript:/data: 等，非法一律降级为纯文本 */
function safeHref(raw: string): string | null {
  const href = raw.trim()
  if (!href) return null
  if (href.startsWith("/") || href.startsWith("#")) return href
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href
  return null
}

/** 去掉原始 HTML 标签，避免 `<img onerror=...>` 之类以源码形式出现在页面上 */
function stripHtml(value: string): string {
  return value.replace(/<\/?[a-zA-Z][^>]*>/g, "")
}

/** `**bold**` 内的内容仍然可能含 `code` / 链接，这里按递归解析处理嵌套 */
function pushInline(
  out: MdxInlineSegment[],
  type: "strong" | "em" | "del",
  value: string
) {
  const inner = parseInline(value)
  if (inner.length === 0) return
  // 简单嵌套（如 **`code`**）：把内层片段包进外层样式
  for (const seg of inner) {
    if (seg.type === "text") {
      out.push({ type, value: seg.value })
    } else if (seg.type === "break") {
      out.push(seg)
    } else if (seg.type === "code") {
      out.push({ type, value: `\`${seg.value}\`` })
    } else if (seg.type === "link") {
      out.push({ type, value: seg.value })
    } else {
      out.push({ type, value: seg.value })
    }
  }
}

/**
 * 内联语法解析。
 * 采用「一次扫描 + 优先级」策略：
 *   行内代码 > 链接/图片 > 粗体 > 斜体 > 删除线
 * 未闭合的标记会落到 text 分支，按字面显示。
 */
export function parseInline(input: string): MdxInlineSegment[] {
  const out: MdxInlineSegment[] = []
  let buf = ""
  let i = 0

  const flush = () => {
    if (buf) {
      out.push({ type: "text", value: stripHtml(buf) })
      buf = ""
    }
  }

  while (i < input.length) {
    const rest = input.slice(i)
    let m: RegExpExecArray | null = null

    // 1) 行内代码（内容字面，不做任何再解析）
    if (rest[0] === "`") {
      m = /^`([^`\n]+)`/.exec(rest)
      if (m) {
        flush()
        out.push({ type: "code", value: m[1] })
        i += m[0].length
        continue
      }
    }

    // 2) 图片：只取 alt 文本（简介里不放图片）
    if (rest[0] === "!") {
      m = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(rest)
      if (m) {
        buf += m[1]
        i += m[0].length
        continue
      }
    }

    // 3) 链接
    if (rest[0] === "[") {
      m = /^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(rest)
      if (m) {
        const href = safeHref(m[2])
        if (href) {
          flush()
          out.push({ type: "link", value: m[1], href })
        } else {
          // 非白名单协议：整段按字面保留（不能只留文字，否则会漏出残缺的 ")"）
          buf += m[0]
        }
        i += m[0].length
        continue
      }
    }

    // 4) 删除线
    if (rest.startsWith("~~")) {
      m = /^~~([\s\S]+?)~~/.exec(rest)
      if (m) {
        flush()
        pushInline(out, "del", m[1])
        i += m[0].length
        continue
      }
    }

    // 5) 粗体（** 优先于 *）
    if (rest.startsWith("**") || rest.startsWith("__")) {
      const mark = rest.slice(0, 2)
      const re = mark === "**" ? /^\*\*([\s\S]+?)\*\*/ : /^__([\s\S]+?)__/
      m = re.exec(rest)
      if (m) {
        flush()
        pushInline(out, "strong", m[1])
        i += m[0].length
        continue
      }
    }

    // 6) 斜体
    if (rest[0] === "*" || rest[0] === "_") {
      const mark = rest[0]
      const re = mark === "*" ? /^\*([^*\n]+?)\*/ : /^_([^_\n]+?)_/
      m = re.exec(rest)
      if (m) {
        flush()
        pushInline(out, "em", m[1])
        i += m[0].length
        continue
      }
    }

    // 7) 换行
    if (rest[0] === "\n") {
      flush()
      out.push({ type: "break" })
      i += 1
      continue
    }

    buf += rest[0]
    i += 1
  }

  flush()
  return out
}

/** 是否含内联 Markdown 标记（用于编辑器的「将按 Markdown 渲染」提示） */
export function hasInlineMarkdown(text: string): boolean {
  return /(`[^`\n]+`|\*\*[\s\S]+?\*\*|__[\s\S]+?__|~~[\s\S]+?~~|\*[^*\n]+?\*|_[^_\n]+?_|\[[^\]]+\]\([^)\s]+)/.test(
    text
  )
}

/**
 * 降级为纯文本：用于 meta description / RSS `<description>` 这类不能带标记的场景。
 * 保留链接文字、去掉语法符号与换行。
 */
export function stripMarkdown(text: string): string {
  const segments = parseInline(text)
  const parts = segments.map((seg) => {
    if (seg.type === "break") return " "
    return seg.value
  })
  return parts.join("").replace(/\s+/g, " ").trim()
}
