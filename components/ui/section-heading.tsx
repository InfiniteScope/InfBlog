import { cn } from "@/lib/utils"

interface SectionHeadingProps {
  /** 工业编号，如 "01"；不传则不显示编号 */
  index?: string
  children: React.ReactNode
  className?: string
}

/**
 * v2 区块标题：`01 // LABEL ─────────`（编号 + 等宽标签 + 发丝线）。
 * legacy 模式下自动退化为旧版 display 字体小标题（隐藏编号与发丝线）。
 */
export function SectionHeading({
  index,
  children,
  className,
}: SectionHeadingProps) {
  return (
    <h3 className={cn("v2-heading", className)}>
      {index ? <span className="v2-heading-index">{index}</span> : null}
      <span>{children}</span>
      <span className="v2-heading-rule" aria-hidden />
    </h3>
  )
}
