"use client"

import { cn } from "@/lib/utils"

interface TechMarqueeProps {
  items: string[]
  className?: string
}

/**
 * 斜向无限流动字带（CSS 动画，三排反向 + 错位）。
 * 每排内容复制两份实现无缝循环；整体 rotate 形成斜向带。
 */
export function TechMarquee({ items, className }: TechMarqueeProps) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {/* 斜向带：整体旋转，铺满底部区域；仅中间一排用 accent 变体（克制） */}
      <div className="absolute inset-x-[-30%] top-6 -rotate-[8deg] space-y-3">
        <MarqueeRow items={items} direction="left" index={0} />
        <MarqueeRow items={items} direction="right" accent index={1} />
        <MarqueeRow items={items} direction="left" index={2} offset />
      </div>
    </div>
  )
}

function MarqueeRow({
  items,
  direction,
  accent = false,
  index = 0,
  offset = false,
}: {
  items: string[]
  direction: "left" | "right"
  accent?: boolean
  index?: number
  offset?: boolean
}) {
  const seq = [...items, ...items]
  return (
    <div className="flex w-max" aria-hidden>
      <div
        className={cn(
          "flex shrink-0 items-center gap-4",
          offset && "pl-8",
          direction === "left"
            ? "animate-tech-marquee-left"
            : "animate-tech-marquee-right"
        )}
        style={{ animationDelay: `${-index * 4}s` }}
      >
        {seq.map((item, i) => (
          <span
            key={`${direction}-${i}`}
            className={cn(
              "v2-pill flex items-center gap-2 whitespace-nowrap px-4 py-1.5 text-sm font-medium",
              accent && "v2-pill-accent"
            )}
          >
            <span className="v2-pill-dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
