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
      {/* 斜向带：整体旋转，铺满底部区域 */}
      <div className="absolute inset-x-[-30%] top-6 -rotate-[8deg] space-y-3">
        <MarqueeRow items={items} direction="left" accent index={0} />
        <MarqueeRow items={items} direction="right" index={1} />
        <MarqueeRow items={items} direction="left" accent index={2} offset />
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
              "flex items-center gap-2 whitespace-nowrap rounded-full border px-5 py-2 text-base font-medium backdrop-blur-sm",
              accent
                ? "border-accent/35 bg-accent/5 text-accent"
                : "border-border/60 bg-card/60 text-muted-foreground"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-accent/60" />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
