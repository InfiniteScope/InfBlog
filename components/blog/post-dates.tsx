import { Calendar, RefreshCw } from "lucide-react"

import { cn } from "@/lib/utils"

interface PostDatesProps {
  date: string
  updatedAt?: string
  /** 图标尺寸类（默认 h-3.5 w-3.5） */
  iconClassName?: string
  /** 毫秒级时间戳时的容器类 */
  className?: string
}

/**
 * 文章卡片日期：发布时间（Calendar）在前，更新时间（RefreshCw）在后；
 * 更新时间与发布时间相同或缺失时只显示发布时间，避免重复。
 */
export function PostDates({
  date,
  updatedAt,
  iconClassName = "h-3.5 w-3.5",
  className,
}: PostDatesProps) {
  const published = new Date(date).toLocaleDateString("zh-CN")
  const updatedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString("zh-CN")
    : null
  const updated = updatedDate && updatedDate !== published ? updatedDate : null

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <span className="inline-flex items-center gap-1" title="发布时间">
        <Calendar className={cn(iconClassName, "shrink-0")} />
        {published}
      </span>
      {updated && (
        <span className="inline-flex items-center gap-1" title="更新时间">
          <RefreshCw className={cn(iconClassName, "shrink-0")} />
          {updated}
        </span>
      )}
    </span>
  )
}
