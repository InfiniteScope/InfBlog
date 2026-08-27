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
 * - 注意：不能用 filter/blur 参与 animate——动画结束后内联样式会常驻
 *   `filter: blur(0px)`，非 none 的 filter 会建立 containing block，
 *   把所有 position:fixed 后代（悬浮按钮等）捕获成相对定位（沉到页面底部）。
 *   只用 opacity + y：静止后 motion 写 `transform: none`，不捕获 fixed。
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    // initial={false}：SSR 首屏不做进入动画（transform 值水合时不一致
    // 会触发 React 水合报警），只在客户端导航时才有进场/退场。
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
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
