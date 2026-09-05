"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"

/** 刻意不均匀的延迟序列：规律排布中的不规律节奏 */
const DELAYS = [0, 0.07, 0.03, 0.11, 0.05, 0.09, 0.02, 0.13, 0.06, 0.1]

interface TagsFlowProps {
  tags: [string, number][]
}

/** 标签流：滚入视口时以不规则延迟依次飘落（reduced-motion 下纯淡入） */
export function TagsFlow({ tags }: TagsFlowProps) {
  const reduce = useReducedMotion()

  return (
    <div className="flex flex-wrap gap-2">
      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无标签</p>
      ) : (
        tags.map(([tag, count], i) => (
          <motion.span
            key={tag}
            className="inline-block"
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, transform: "translateY(10px)" }
            }
            whileInView={
              reduce
                ? { opacity: 1 }
                : { opacity: 1, transform: "translateY(0px)" }
            }
            viewport={{ once: true, margin: "-40px" }}
            transition={{
              duration: 0.45,
              delay: DELAYS[i % DELAYS.length],
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Link
              href={`/blog?tag=${encodeURIComponent(tag)}`}
              className="v2-tag"
            >
              <span>{tag}</span>
              <span className="v2-tag-count">{count}</span>
            </Link>
          </motion.span>
        ))
      )}
    </div>
  )
}
