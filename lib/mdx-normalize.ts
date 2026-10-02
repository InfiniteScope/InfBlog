/**
 * MDX 源归一化：把标准 Markdown 支持、但 MDX 不支持的常见写法转成合法形式，
 * 避免一个字符让整页 500（如 `<https://x>` 会报 "Unexpected character ... before local name"）。
 *
 * 规则（均跳过代码围栏与行内代码片段）：
 * - 尖括号自动链接 `<https://x>` / `<mailto:x>` → `[x](x)`
 * - 裸 void 标签 `<br>` / `<hr>` → 自闭合 `<br />` / `<hr />`
 */
export function normalizeMdxSource(source: string): string {
  const lines = source.split("\n")
  let inFence = false

  return lines
    .map((line) => {
      const trimmed = line.trimStart()
      if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
        inFence = !inFence
        return line
      }
      if (inFence) return line

      // 正则交替匹配「行内代码」与「尖括号自动链接」，只转换后者
      return line
        .replace(
          /`[^`]*`|<((?:https?|mailto):[^>\s]+)>/g,
          (match, url: string | undefined) =>
            url ? `[${url}](${url})` : match
        )
        .replace(/<(br|hr)\s*>/gi, "<$1 />")
    })
    .join("\n")
}
