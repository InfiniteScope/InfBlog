import { visit } from "unist-util-visit"

/**
 * MDX v3 要求 JSX 的 style 属性是对象（style={{...}}），而
 * rehype-katex 输出 <span style="..."> 字符串 —— 编译直接报
 * "Could not parse `style` attribute on `span`"。
 * 本插件把 hast 里元素节点的字符串 style 转成 JSX 对象。
 */
function parseStyle(input: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of input.split(";")) {
    const idx = part.indexOf(":")
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (key && value) out[key] = value
  }
  return out
}

export function rehypeStyleObject() {
  return (tree: unknown) => {
    visit(tree as never, "element" as never, (node: any) => {
      const props = node.properties
      if (props && typeof props.style === "string") {
        props.style = parseStyle(props.style)
      }
    })
  }
}
