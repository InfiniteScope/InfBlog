import { Calendar, RefreshCw } from "lucide-react"

import { formatDateTime, shouldShowUpdatedAt } from "@/lib/format-date"
import { cn } from "@/lib/utils"

interface PostDatesProps {
  date: string
  updatedAt?: string
  /** 图标尺寸类（默认 h-3.5 w-3.5） */
  iconClassName?: string
  /** 毫秒级时间戳时的容器类 */
  className?: string
  /** 更新时间前缀文案（详情页用「更新于」，卡片留空） */
  updatedLabel?: string
}

/**
 * 文章日期：发布时间（Calendar）在前，更新时间（RefreshCw）在后。
 * - 精确到分钟（固定 Asia/Shanghai，见 `lib/format-date.ts`）；frontmatter 只写日期时只显示到日
 * - 更新时间与发布时间同一分钟、或早于发布时间（文件 mtime 回退造成的脏数据）时只显示发布时间
 */
export function PostDates({
  date,
  updatedAt,
  iconClassName = "h-3.5 w-3.5",
  className,
  updatedLabel,
}: PostDatesProps) {
  const published = formatDateTime(date)
  const showUpdated = shouldShowUpdatedAt(date, updatedAt)

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-x-3 gap-y-1",
        className
      )}
    >
      <span className="inline-flex items-center gap-1" title="发布时间">
        <Calendar className={cn(iconClassName, "shrink-0")} />
        {published}
      </span>
      {showUpdated && updatedAt && (
        <span className="inline-flex items-center gap-1" title="更新时间">
          <RefreshCw className={cn(iconClassName, "shrink-0")} />
          {updatedLabel}
          {formatDateTime(updatedAt)}
        </span>
      )}
    </span>
  )
}
