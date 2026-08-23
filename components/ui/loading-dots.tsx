"use client"

import { cn } from "@/lib/utils"

interface LoadingDotsProps {
  className?: string
  /** dot size in px */
  size?: number
}

/** MagicUI-style bouncy loading dots (pure CSS, reduced-motion aware). */
export function LoadingDots({ className, size = 4 }: LoadingDotsProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      role="status"
      aria-label="加载中"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-bounce rounded-full bg-accent"
          style={{
            width: size,
            height: size,
            animationDelay: `${i * 0.12}s`,
            animationDuration: "0.9s",
          }}
        />
      ))}
    </span>
  )
}
