"use client"

import { motion, useReducedMotion } from "motion/react"

interface RevealProps {
  children: React.ReactNode
  className?: string
  /** 入场延迟（秒），用于不规则 stagger */
  delay?: number
  /**
   * rise: 上浮 + 淡入（默认）；wipe: clip-path 横向擦除（终端绘线感）。
   * reduced-motion 下降级为纯淡入。
   */
  variant?: "rise" | "wipe"
}

/** 滚动入场原语：whileInView 一次性触发，只动 transform/opacity/clip-path */
export function Reveal({
  children,
  className,
  delay = 0,
  variant = "rise",
}: RevealProps) {
  const reduce = useReducedMotion()

  const initial = reduce
    ? { opacity: 0 }
    : variant === "wipe"
      ? { opacity: 0, clipPath: "inset(0 100% 0 0)" }
      : { opacity: 0, transform: "translateY(24px)" }

  const whileInView = reduce
    ? { opacity: 1 }
    : variant === "wipe"
      ? { opacity: 1, clipPath: "inset(0 0% 0 0)" }
      : { opacity: 1, transform: "translateY(0px)" }

  return (
    <motion.div
      initial={initial}
      whileInView={whileInView}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: variant === "wipe" ? 0.7 : 0.55,
        delay,
        ease: variant === "wipe" ? [0.77, 0, 0.175, 1] : [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
