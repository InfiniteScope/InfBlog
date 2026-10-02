"use client"

import { useState } from "react"

interface CoverImageProps {
  src: string
  alt: string
  containerClassName?: string
  imgClassName?: string
}

/**
 * 封面图容错：图片加载失败时整个容器不渲染（returns null），
 * 避免裂图撑出大块空白（本地缺图、外链失效、服务器图未同步等场景）。
 */
export function CoverImage({
  src,
  alt,
  containerClassName,
  imgClassName,
}: CoverImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) return null

  return (
    <div className={containerClassName}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={imgClassName}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  )
}
