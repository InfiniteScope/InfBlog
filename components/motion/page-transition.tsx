"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

/**
 * 路由转场（Motion 推荐模式：AnimatePresence + key=pathname）
 * - 旧页：向上轻滑 + 淡出（exit）
 * - 新页：向下轻滑 + 淡入（initial → animate）
 * - mode="wait"：等旧页完全退场再渲染新页，避免瞬移
 * - 动画结束后清除 transform/filter：确保页内 position:fixed
 *   元素（留言墙输入条等）不被 transform 祖先捕获退化为 absolute
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    // initial={false}：SSR 首屏不做进入动画（transform 值水合时不一致
    // 会触发 React 水合报警），只在客户端导航时才有进场/退场。
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 14, filter: "blur(2px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -14, filter: "blur(2px)" }}
        transition={{
          duration: 0.3,
          ease: [0.22, 1, 0.36, 1],
        }}
        id="page-transition-root"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
