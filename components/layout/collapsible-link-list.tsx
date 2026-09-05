"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"

const COLLAPSED_COUNT = 3

interface CollapsibleLinkListProps {
  links: { name: string; url: string }[]
}

/** 侧栏链接列表：超过 3 个时折叠其余，点击按钮展开/收起全部 */
export function CollapsibleLinkList({ links }: CollapsibleLinkListProps) {
  const [expanded, setExpanded] = useState(false)
  const collapsible = links.length > COLLAPSED_COUNT
  const visible =
    collapsible && !expanded ? links.slice(0, COLLAPSED_COUNT) : links

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((link) => (
        <Button
          key={link.name}
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          asChild
        >
          <Link href={link.url} target="_blank" rel="noopener noreferrer">
            {link.name}
          </Link>
        </Button>
      ))}
      {collapsible && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-accent hover:text-accent-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              收起
              <ChevronUp className="ml-0.5 h-3 w-3" />
            </>
          ) : (
            <>
              展开
              <ChevronDown className="ml-0.5 h-3 w-3" />
            </>
          )}
        </Button>
      )}
    </div>
  )
}
