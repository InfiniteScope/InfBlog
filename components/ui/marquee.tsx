"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

interface MarqueeProps {
  children: ReactNode
  className?: string
}

export function Marquee({ children, className }: MarqueeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setOverflow(el.scrollWidth > el.clientWidth)
  }, [children])

  return (
    <div ref={ref} className={cn("overflow-hidden whitespace-nowrap", className)}>
      <div className={cn("inline-block", overflow && "animate-marquee")}>
        {children}
        {overflow && <>&nbsp;&nbsp;&nbsp;&nbsp;{children}</>}
      </div>
    </div>
  )
}
