"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

import { BookmarkButton } from "@/components/blog/bookmark-button"

interface DocBookmarkFloatProps {
  slug: string
  title: string
}

/** 文库详情页右下角浮动书签按钮（portal 到 body，脱离转场层） */
export function DocBookmarkFloat({ slug, title }: DocBookmarkFloatProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted || typeof document === "undefined") return null

  return createPortal(
    <div className="fixed bottom-20 right-6 z-40">
      <BookmarkButton type="doc" slug={slug} title={title} />
    </div>,
    document.body
  )
}
