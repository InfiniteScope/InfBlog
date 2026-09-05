"use client"

import { cn } from "@/lib/utils"
import { WeatherWidget } from "@/components/weather/weather-widget"
import { useNavbarVisibility } from "@/components/layout/navbar-visibility-provider"
import {
  useAspectRatio,
  ASPECT_RATIO_THRESHOLD,
  DRAWER_BREAKPOINT,
} from "@/lib/hooks/use-aspect-ratio"

/**
 * 天气/时间栏显示策略：
 * - 比例 >= 1.61：顶部居中显示（导航栏中间位置）
 * - 比例 < 1.61 且宽度 >= 1024：抽屉按钮已消失的"尴尬区间"，
 *   改为主内容区顶部居中（屏幕中心向右偏置一点点），避免无处显示
 * - 比例 < 1.61 且宽度 < 1024：不渲染顶部栏，由抽屉内 WeatherWidget 接管
 * - 跟随顶栏滚动收起/展开（useNavbarVisibility）
 */
export function WeatherBar() {
  const { aspectRatio, width } = useAspectRatio()
  const { hidden } = useNavbarVisibility()

  // 窄屏 + 窄比例：抽屉内显示，顶部栏不渲染
  if (aspectRatio < ASPECT_RATIO_THRESHOLD && width < DRAWER_BREAKPOINT) {
    return null
  }

  // 宽比例：导航栏居中；尴尬区间：向右偏置避开抽屉按钮原位
  const horizontal =
    aspectRatio >= ASPECT_RATIO_THRESHOLD
      ? "left-1/2"
      : "left-[calc(50%_+_56px)]"

  return (
    <div
      className={cn(
        "pointer-events-auto fixed top-7 z-50 -translate-x-1/2 transition-all duration-300",
        horizontal,
        hidden
          ? "pointer-events-none -translate-y-24 opacity-0"
          : "-translate-y-1/2"
      )}
    >
      <WeatherWidget />
    </div>
  )
}
