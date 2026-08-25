"use client"

import { WeatherWidget } from "@/components/weather/weather-widget"
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
 */
export function WeatherBar() {
  const { aspectRatio, width } = useAspectRatio()

  // 窄屏 + 窄比例：抽屉内显示，顶部栏不渲染
  if (aspectRatio < ASPECT_RATIO_THRESHOLD && width < DRAWER_BREAKPOINT) {
    return null
  }

  // 宽比例：导航栏居中
  if (aspectRatio >= ASPECT_RATIO_THRESHOLD) {
    return (
      <div className="pointer-events-auto fixed left-1/2 top-7 z-50 -translate-x-1/2 -translate-y-1/2">
        <WeatherWidget />
      </div>
    )
  }

  // 尴尬区间：比例窄但无抽屉按钮，与顶部居中条同高，仅向右偏置
  return (
    <div className="pointer-events-auto fixed left-[calc(50%+56px)] top-7 z-50 -translate-x-1/2 -translate-y-1/2">
      <WeatherWidget />
    </div>
  )
}
